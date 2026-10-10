# Myintimy API

API FastAPI de Myintimy avec PostgreSQL/SQLAlchemy/Alembic. Le domaine catalogue est maintenant présent : catégories, produits, couleurs, tailles, variantes, images et historique de stock.

## Démarrage local

```bash
cd backend
python -m venv .venv
# Linux/macOS : source .venv/bin/activate
# Windows : .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
```

Sous Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Depuis la racine du projet :

```bash
docker compose up -d db
```

Puis dans `backend/` :

```bash
alembic upgrade head
python -m app.scripts.seed_catalog
pytest
uvicorn app.main:app --reload
```

## API

Health checks :

```text
GET /health
GET /api/v1/health
GET /api/v1/health/database
```

Catalogue :

```text
GET /api/v1/categories
GET /api/v1/categories/{slug}
GET /api/v1/colors
GET /api/v1/sizes
GET /api/v1/products
GET /api/v1/products/{identifier}
GET /api/v1/products/{identifier}/related
```

## Qualité

```bash
pytest
alembic check
```

Le service de stock existe côté métier mais n'est pas encore exposé en mutation publique : les futures routes d'administration l'utiliseront afin de conserver la traçabilité des mouvements.
