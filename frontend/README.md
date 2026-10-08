# Myintimy

Boutique React/Tailwind en cours de transformation en application e-commerce complète. Le frontend existant reste fonctionnel avec son catalogue local pendant que le backend FastAPI est construit progressivement.

## Structure

```text
.
├── src/                    # Frontend React existant
│   ├── api/                # Client HTTP centralisé
│   ├── config/             # Configuration frontend
│   ├── context/            # État boutique
│   ├── data/               # Catalogue temporaire / fixtures
│   ├── domain/             # Logique testable indépendante de React
│   ├── components/
│   └── pages/
├── backend/                # API FastAPI
├── docs/
├── docker-compose.yml      # PostgreSQL local
└── package.json
```

## Frontend

```bash
npm install
npm run dev
```

Contrôles :

```bash
npm run lint
npm run test:run
npm run build
```

Copiez `.env.example` vers `.env` pour personnaliser l'URL API.

### Catalogue temporaire

`src/data/catalog.js` contient encore les 26 produits utilisés par le frontend. Il est volontairement conservé comme fixture pendant la migration vers PostgreSQL.

### Photos temporaires

Placez les images dans `public/photos/` puis ajoutez à un produit :

```js
images: ["/photos/seraphine-1.jpg", "/photos/seraphine-2.jpg", "/photos/seraphine-3.jpg"]
```

La future administration remplacera ce fonctionnement par un vrai service média.

## Backend

Voir [`backend/README.md`](backend/README.md).

Démarrage rapide de PostgreSQL :

```bash
docker compose up -d db
```

Puis :

```bash
cd backend
python -m venv .venv
# activez l'environnement virtuel
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

API locale : `http://localhost:8000`.

Health checks :

```text
GET /health
GET /api/v1/health
GET /api/v1/health/database
```

## État actuel

Phase 0 et Phase 1 : socle de stabilisation frontend et fondations backend. Aucune table métier e-commerce n'est encore créée. Les prochaines étapes concernent catalogue, catégories, variantes, images et stock.

Le détail des décisions et contrôles se trouve dans [`docs/PHASE_0_1.md`](docs/PHASE_0_1.md).
