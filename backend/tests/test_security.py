from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin import AdminUser


def _create_admin() -> None:
    with SessionLocal() as db:
        db.add(
            AdminUser(
                email="security@myintimy.test",
                full_name="Security Admin",
                password_hash=hash_password("a-very-safe-password"),
                is_active=True,
                is_superuser=True,
            )
        )
        db.commit()


def test_admin_browser_session_uses_cookie_and_csrf(client, seeded_db):
    _create_admin()
    login = client.post(
        "/api/v1/admin/auth/login",
        json={"email": "security@myintimy.test", "password": "a-very-safe-password"},
    )
    assert login.status_code == 200
    csrf = login.headers.get("x-csrf-token")
    assert csrf
    assert client.cookies.get("myintimy_admin_session")
    assert client.cookies.get("myintimy_admin_csrf") == csrf

    # No Authorization header: the HttpOnly cookie is enough for reads.
    me = client.get("/api/v1/admin/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "security@myintimy.test"

    blocked = client.post("/api/v1/admin/categories", json={"title": "Sécurité"})
    assert blocked.status_code == 403
    assert blocked.json()["error"]["code"] == "CSRF_TOKEN_INVALID"

    allowed = client.post(
        "/api/v1/admin/categories",
        headers={"X-CSRF-Token": csrf},
        json={"title": "Sécurité"},
    )
    assert allowed.status_code == 201

    logout = client.post("/api/v1/admin/auth/logout", headers={"X-CSRF-Token": csrf})
    assert logout.status_code == 204
    assert client.get("/api/v1/admin/auth/me").status_code == 401


def test_customer_browser_session_uses_cookie_and_csrf(client, seeded_db):
    register = client.post(
        "/api/v1/client/auth/register",
        json={
            "full_name": "Cliente Sécurité",
            "email": "client.security@example.com",
            "phone": "+22901020304",
            "password": "MotDePasse2026!",
        },
    )
    assert register.status_code == 201
    csrf = register.headers.get("x-csrf-token")
    assert csrf
    assert client.cookies.get("myintimy_customer_session")

    assert client.get("/api/v1/client/me").status_code == 200

    blocked = client.post("/api/v1/client/me/favorites/1")
    assert blocked.status_code == 403
    allowed = client.post("/api/v1/client/me/favorites/1", headers={"X-CSRF-Token": csrf})
    assert allowed.status_code == 201


def test_login_rate_limit_returns_429(client):
    for _ in range(5):
        response = client.post(
            "/api/v1/admin/auth/login",
            json={"email": "unknown@myintimy.test", "password": "not-the-password"},
        )
        assert response.status_code == 401

    blocked = client.post(
        "/api/v1/admin/auth/login",
        json={"email": "unknown@myintimy.test", "password": "not-the-password"},
    )
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "RATE_LIMITED"
    assert int(blocked.headers["retry-after"]) >= 1


def test_security_headers_are_present(client):
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "camera=()" in response.headers["permissions-policy"]


def test_production_configuration_rejects_default_or_weak_secret():
    settings = Settings(
        app_env="production",
        debug=False,
        jwt_secret="short",
        frontend_origins="https://shop.example.com",
    )
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        settings.validate_security()


def test_production_configuration_rejects_wildcard_cors():
    settings = Settings(
        app_env="production",
        debug=False,
        jwt_secret="x" * 48,
        frontend_origins="*",
    )
    with pytest.raises(RuntimeError, match="FRONTEND_ORIGINS"):
        settings.validate_security()


def test_every_admin_business_route_requires_admin_authentication():
    from app.main import app

    exempt = {"/api/v1/admin/auth/login", "/api/v1/admin/auth/logout"}
    unprotected = []
    for route in app.routes:
        path = getattr(route, "path", "")
        if not path.startswith("/api/v1/admin") or path in exempt:
            continue
        dependant = getattr(route, "dependant", None)
        dependency_names = {
            getattr(dependency.call, "__name__", "")
            for dependency in (dependant.dependencies if dependant else [])
        }
        if "get_current_admin" not in dependency_names:
            unprotected.append(path)

    assert unprotected == []
