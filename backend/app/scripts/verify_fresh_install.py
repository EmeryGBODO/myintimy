from __future__ import annotations

import argparse
import os
import re
import secrets
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url

BACKEND_ROOT = Path(__file__).resolve().parents[2]
SAFE_DATABASE_MARKERS = ("test", "qa", "fresh")


class FreshInstallError(RuntimeError):
    pass


@dataclass(frozen=True)
class DatabaseSnapshot:
    categories: int
    colors: int
    sizes: int
    products: int
    variants: int
    initial_stock_movements: int


def _is_safe_database_name(name: str | None) -> bool:
    normalized = (name or "").strip().lower()
    return bool(normalized) and any(marker in normalized for marker in SAFE_DATABASE_MARKERS)


def _validate_target_database(url: URL) -> str:
    if not url.drivername.startswith("postgresql"):
        raise FreshInstallError("La recette base vierge nécessite PostgreSQL.")
    database = url.database or ""
    if not _is_safe_database_name(database):
        markers = ", ".join(SAFE_DATABASE_MARKERS)
        raise FreshInstallError(
            f"Refus de supprimer la base '{database}'. Son nom doit contenir un marqueur de sécurité : {markers}."
        )
    if database.lower() in {"postgres", "template0", "template1", "myintimy"}:
        raise FreshInstallError(f"La base '{database}' est protégée et ne peut pas être utilisée pour cette recette.")
    return database


def _maintenance_connection_kwargs(url: URL) -> dict[str, object]:
    return {
        "host": url.host or "localhost",
        "port": url.port or 5432,
        "user": url.username,
        "password": url.password,
        "dbname": "postgres",
        "autocommit": True,
    }


def _reset_database(url: URL) -> None:
    import psycopg
    from psycopg import sql

    database = _validate_target_database(url)
    with psycopg.connect(**_maintenance_connection_kwargs(url)) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()",
                (database,),
            )
            cursor.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(database)))
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))


def _drop_database(url: URL) -> None:
    import psycopg
    from psycopg import sql

    database = _validate_target_database(url)
    with psycopg.connect(**_maintenance_connection_kwargs(url)) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()",
                (database,),
            )
            cursor.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(database)))


def _run(
    command: list[str],
    *,
    env: dict[str, str],
    display_command: list[str] | None = None,
) -> subprocess.CompletedProcess[str]:
    print("+", " ".join(display_command or command))
    result = subprocess.run(
        command,
        cwd=BACKEND_ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.returncode != 0:
        if result.stderr.strip():
            print(result.stderr.strip(), file=sys.stderr)
        raise FreshInstallError(f"Commande en échec ({result.returncode}) : {' '.join(command)}")
    return result


def _alembic_heads(env: dict[str, str]) -> list[str]:
    result = _run([sys.executable, "-m", "alembic", "heads"], env=env)
    heads: list[str] = []
    for line in result.stdout.splitlines():
        match = re.match(r"^([0-9A-Za-z_]+)\s+\(head\)", line.strip())
        if match:
            heads.append(match.group(1))
    return heads


def _database_versions(database_url: str) -> list[str]:
    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            return list(conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num")).scalars())
    finally:
        engine.dispose()


def _snapshot(database_url: str) -> DatabaseSnapshot:
    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            def count(table: str) -> int:
                return int(conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar_one())

            movement_count = int(
                conn.execute(
                    text("SELECT COUNT(*) FROM inventory_movements WHERE movement_type = 'initial_stock'")
                ).scalar_one()
            )
            return DatabaseSnapshot(
                categories=count("categories"),
                colors=count("colors"),
                sizes=count("sizes"),
                products=count("products"),
                variants=count("product_variants"),
                initial_stock_movements=movement_count,
            )
    finally:
        engine.dispose()


def _assert_seed_is_useful(snapshot: DatabaseSnapshot) -> None:
    values = {
        "categories": snapshot.categories,
        "colors": snapshot.colors,
        "sizes": snapshot.sizes,
        "products": snapshot.products,
        "variants": snapshot.variants,
    }
    empty = [name for name, value in values.items() if value <= 0]
    if empty:
        raise FreshInstallError(f"Seed incomplet : tables sans données : {', '.join(empty)}")
    if snapshot.initial_stock_movements != snapshot.variants:
        raise FreshInstallError(
            "Le seed initial doit créer exactement un mouvement de stock initial par variante."
        )


def _verify_admin(database_url: str, email: str) -> None:
    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT COUNT(*), BOOL_AND(is_active), BOOL_AND(is_superuser) "
                    "FROM admin_users WHERE lower(email) = lower(:email)"
                ),
                {"email": email},
            ).one()
            if int(row[0]) != 1 or not bool(row[1]) or not bool(row[2]):
                raise FreshInstallError("Le compte administrateur de recette n'a pas été créé correctement.")
    finally:
        engine.dispose()


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _verify_running_api(env: dict[str, str]) -> None:
    port = _free_port()
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--log-level",
        "warning",
    ]
    process = subprocess.Popen(
        command,
        cwd=BACKEND_ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    base_url = f"http://127.0.0.1:{port}"
    try:
        deadline = time.monotonic() + 15
        last_error: Exception | None = None
        while time.monotonic() < deadline:
            if process.poll() is not None:
                stdout, stderr = process.communicate(timeout=2)
                raise FreshInstallError(
                    "L'API s'est arrêtée pendant le démarrage.\n"
                    f"stdout: {stdout}\nstderr: {stderr}"
                )
            try:
                response = httpx.get(f"{base_url}/api/v1/health", timeout=1)
                if response.status_code == 200:
                    break
            except httpx.HTTPError as exc:
                last_error = exc
            time.sleep(0.25)
        else:
            raise FreshInstallError(f"L'API n'a pas démarré dans le délai prévu : {last_error}")

        app_health = httpx.get(f"{base_url}/api/v1/health", timeout=3)
        db_health = httpx.get(f"{base_url}/api/v1/health/database", timeout=3)
        if app_health.status_code != 200 or app_health.json().get("status") != "ok":
            raise FreshInstallError(f"Health API invalide : {app_health.status_code} {app_health.text}")
        if db_health.status_code != 200 or db_health.json().get("database") != "available":
            raise FreshInstallError(f"Health DB invalide : {db_health.status_code} {db_health.text}")
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def _build_env(database_url: str) -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "APP_ENV": "test",
            "DEBUG": "false",
            "DATABASE_URL": database_url,
            "FRONTEND_ORIGINS": "http://localhost:5173",
            "JWT_SECRET": "fresh-install-test-secret-that-is-never-used-in-production",
        }
    )
    return env


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Vérifie une installation Myintimy sur une base PostgreSQL vierge. "
            "ATTENTION : la base cible est supprimée puis recréée."
        )
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("MYINTIMY_FRESH_INSTALL_DATABASE_URL", ""),
        help="URL PostgreSQL dédiée à la recette. Le nom doit contenir test, qa ou fresh.",
    )
    parser.add_argument("--admin-email", default="qa-admin@myintimy.local")
    parser.add_argument(
        "--admin-password",
        default=None,
        help="Mot de passe du compte QA. Si absent, un secret temporaire aléatoire est généré.",
    )
    parser.add_argument("--drop-after", action="store_true", help="Supprimer la base de recette après succès.")
    args = parser.parse_args()

    if not args.database_url:
        print(
            "Définis MYINTIMY_FRESH_INSTALL_DATABASE_URL ou utilise --database-url.\n"
            "Exemple : postgresql+psycopg://myintimy:myintimy@localhost:5432/myintimy_fresh_test",
            file=sys.stderr,
        )
        return 2

    admin_password = args.admin_password or secrets.token_urlsafe(24)

    url = make_url(args.database_url)
    database = _validate_target_database(url)
    env = _build_env(args.database_url)

    print(f"Base de recette : {database}")
    print("Réinitialisation complète de la base...")
    _reset_database(url)

    try:
        print("\n[1/6] Vérification d'une seule head Alembic")
        heads = _alembic_heads(env)
        if len(heads) != 1:
            raise FreshInstallError(f"Alembic doit avoir une seule head, trouvé : {heads}")

        print("\n[2/6] Application de toutes les migrations")
        _run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env)
        versions = _database_versions(args.database_url)
        if versions != heads:
            raise FreshInstallError(f"Version DB {versions} différente de la head du code {heads}.")

        print("\n[3/6] Seed catalogue")
        _run([sys.executable, "-m", "app.scripts.seed_catalog"], env=env)
        first_snapshot = _snapshot(args.database_url)
        _assert_seed_is_useful(first_snapshot)

        print("\n[4/6] Vérification de l'idempotence du seed")
        _run([sys.executable, "-m", "app.scripts.seed_catalog"], env=env)
        second_snapshot = _snapshot(args.database_url)
        if second_snapshot != first_snapshot:
            raise FreshInstallError(
                f"Le seed n'est pas idempotent. Avant={first_snapshot}, après={second_snapshot}"
            )

        print("\n[5/6] Création / mise à jour idempotente de l'administrateur")
        create_admin = [
            sys.executable,
            "-m",
            "app.scripts.create_admin",
            "--email",
            args.admin_email,
            "--password",
            admin_password,
            "--name",
            "QA Myintimy",
        ]
        redacted_admin_command = create_admin.copy()
        password_index = redacted_admin_command.index("--password") + 1
        redacted_admin_command[password_index] = "***"
        _run(create_admin, env=env, display_command=redacted_admin_command)
        _run(create_admin, env=env, display_command=redacted_admin_command)
        _verify_admin(args.database_url, args.admin_email)

        print("\n[6/6] Démarrage réel de l'API + health checks")
        _verify_running_api(env)

        print("\nOK - Installation base vierge validée.")
        print(f"Alembic head : {heads[0]}")
        print(
            "Catalogue : "
            f"{first_snapshot.products} produits, {first_snapshot.variants} variantes, "
            f"{first_snapshot.initial_stock_movements} mouvements initiaux"
        )
        print(f"Administrateur : {args.admin_email}")
        return 0
    except Exception:
        print("\nECHEC - La base de recette est conservée pour diagnostic.", file=sys.stderr)
        raise
    finally:
        if args.drop_after:
            print("Suppression de la base de recette...")
            _drop_database(url)


if __name__ == "__main__":
    raise SystemExit(main())
