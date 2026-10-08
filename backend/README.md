# Myintimy API

Socle backend FastAPI de Myintimy. La phase 1 fournit la configuration, PostgreSQL/SQLAlchemy, Alembic, CORS, logs HTTP, format d'erreur uniforme et health checks. Les modèles métier seront ajoutés à partir de la phase catalogue.

## Démarrage local

```bash
cd backend
python -m venv .venv
# Linux/macOS : source .venv/bin/activate
# Windows : .venv\\Scripts\\activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

Sous Windows PowerShell, utilisez `Copy-Item .env.example .env` au lieu de `cp`.

## Base de données

Depuis la racine du projet :

```bash
docker compose up -d db
```

Puis depuis `backend/` :

```bash
alembic upgrade head
```

## Tests

```bash
pytest
```

## Health checks

- `GET /health` : disponibilité du processus API.
- `GET /api/v1/health` : disponibilité de l'API versionnée.
- `GET /api/v1/health/database` : vérifie la connexion à la base.
