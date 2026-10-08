# Myintimy — Phase 0 et Phase 1

## Objectif

Conserver le frontend existant comme référence fonctionnelle, le rendre testable et préparer une intégration API propre, puis fournir un socle backend FastAPI/PostgreSQL/Alembic sans introduire prématurément les modèles métier du catalogue.

## Phase 0 — Stabilisation frontend

### Réalisé

- Le catalogue actuel reste dans `src/data/catalog.js` et sert de fixture de migration.
- La logique du panier est isolée dans `src/domain/cart.js` afin de pouvoir la tester indépendamment de React.
- Une configuration frontend centralisée est disponible dans `src/config/env.js`.
- Le client HTTP unique se trouve dans `src/api/client.js`.
- Les futurs health checks sont exposés dans `src/api/health.js`.
- Les erreurs réseau sont normalisées par `src/api/errors.js`.
- Vitest, Testing Library et ESLint sont déclarés comme outils de qualité frontend.
- Des tests couvrent prix, livraison, résolution produit, panier et un composant React partagé.

### Règles métier conservées

- Monnaie : FCFA, montants entiers.
- Livraison gratuite à partir de 50 000 FCFA.
- Cotonou : 1 500 FCFA sous le seuil de gratuité.
- Autres villes : 3 000 FCFA sous le seuil de gratuité.
- Une ligne panier est identifiée par `produit + couleur + taille`.
- Le panier et les favoris invités restent dans `localStorage` à ce stade.

### Commandes de contrôle

```bash
npm install
npm run lint
npm run test:run
npm run build
```

> Dans l'environnement d'analyse utilisé pour cette livraison, le registre npm n'était pas joignable : les dépendances frontend supplémentaires n'ont donc pas pu être installées ni les commandes ci-dessus exécutées jusqu'au bout. Le code backend, lui, a été testé. Après `npm install` dans un environnement connecté, le `package-lock.json` doit être régénéré avant d'utiliser `npm ci` si nécessaire.

## Phase 1 — Fondations backend

### Stack

- FastAPI
- Pydantic Settings
- SQLAlchemy 2
- PostgreSQL
- Alembic
- pytest / httpx

### Architecture

```text
endpoint
  ↓
service
  ↓
repository
  ↓
database
```

Les couches `services/` et `repositories/` sont volontairement présentes dès maintenant mais restent vides tant qu'aucun domaine métier n'a été ajouté.

### API disponible

- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1/health/database`

### Format d'erreur

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "La ressource demandée n'existe pas.",
    "details": null
  }
}
```

### Configuration

Le backend utilise `backend/.env` et fournit `backend/.env.example`.

Le frontend utilise `.env` et fournit `.env.example` avec :

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_TIMEOUT_MS=10000
```

### Base locale

```bash
docker compose up -d db
cd backend
cp .env.example .env
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

### Contrôles exécutés pendant l'implémentation

- compilation Python : OK ;
- tests backend : 5/5 OK ;
- migration Alembic baseline vers `head` sur base SQLite de contrôle : OK ;
- validation syntaxique des modules JavaScript non-JSX ajoutés : OK.

## Hors périmètre volontaire

Cette phase ne crée encore aucun modèle métier : produit, catégorie, stock, utilisateur, commande, paiement et newsletter restent pour les phases suivantes.
