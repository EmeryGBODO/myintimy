# Myintimy

Boutique React/Tailwind en cours de transformation en application e-commerce complète. Le frontend peut désormais consommer le catalogue FastAPI/PostgreSQL tout en gardant un fallback local pendant la migration.

## Structure

```text
.
├── src/
│   ├── api/                # Client HTTP et API catalogue
│   ├── catalog/            # CatalogProvider + fallback local
│   ├── config/
│   ├── context/
│   ├── data/               # Fixtures temporaires et illustrations
│   ├── domain/
│   ├── components/
│   └── pages/
├── backend/
│   ├── app/models/         # Catalogue, variantes, images, stock
│   ├── app/repositories/
│   ├── app/services/
│   ├── app/seeds/
│   ├── migrations/
│   └── tests/
├── docs/
├── docker-compose.yml
└── package.json
```

## Frontend

```bash
npm install
npm run dev
```

Le `package-lock.json` doit être généré par ce premier `npm install` puis conservé dans le dépôt. Il n'est pas inclus dans cette archive car l'environnement de préparation ne pouvait pas joindre le registre npm pour le régénérer de façon fiable.

Contrôles :

```bash
npm run lint
npm run test:run
npm run build
```

Configuration :

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_TIMEOUT_MS=10000
VITE_CATALOG_API_ENABLED=true
```

Quand l'API catalogue n'est pas joignable, le frontend revient automatiquement sur `src/data/catalog.js`. Pour forcer le mode local, utilisez `VITE_CATALOG_API_ENABLED=false`.

## Backend

Démarrage de PostgreSQL depuis la racine :

```bash
docker compose up -d db
```

Puis :

```bash
cd backend
python -m venv .venv
# Windows : .venv\Scripts\activate
# Linux/macOS : source .venv/bin/activate
pip install -e ".[dev]"
# Windows PowerShell : Copy-Item .env.example .env
# Linux/macOS : cp .env.example .env
alembic upgrade head
python -m app.scripts.seed_catalog
pytest
uvicorn app.main:app --reload
```

API locale : `http://localhost:8000`.

## Catalogue API

```text
GET /api/v1/categories
GET /api/v1/colors
GET /api/v1/sizes
GET /api/v1/products
GET /api/v1/products/{identifier}
GET /api/v1/products/{identifier}/related
```

Le seed reprend les 26 produits du prototype et crée leurs variantes de couleur/taille avec un stock de démonstration.

## Documentation

- [`docs/PHASE_0_1.md`](docs/PHASE_0_1.md) — stabilisation et fondations backend.
- [`docs/PHASE_2.md`](docs/PHASE_2.md) — catalogue, variantes, images, stock et intégration frontend.

## État actuel

Phases 0, 1 et 2 implémentées. La prochaine étape naturelle est l'administration : authentification administrateur, CRUD catégories/produits/variantes, upload d'images et gestion du stock via interface.
