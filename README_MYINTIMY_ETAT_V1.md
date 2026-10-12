# Myintimy

## État du projet

Myintimy est aujourd'hui une boutique e-commerce React reliée à un backend FastAPI/PostgreSQL pour le catalogue et l'administration.

Le socle catalogue est fonctionnel. Le back-office permet déjà de gérer les catégories, les produits, les déclinaisons, les images et le stock. La prochaine grande étape pour obtenir une première version réellement livrable est de terminer le cycle de vente : commande, paiement, livraison, suivi et exploitation des commandes.

Ce document décrit uniquement ce qui est effectivement présent dans le projet à ce stade et les limites connues.

---

## 1. Stack technique

### Frontend

- React 18
- Vite
- React Router avec `HashRouter`
- Tailwind CSS
- Vitest
- React Testing Library
- ESLint

### Backend

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic
- Pytest
- JWT pour l'administration
- Argon2 pour les mots de passe administrateur

### Structure générale

```text
myintimy/
├── frontend/
│   ├── src/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── catalog/
│   │   ├── components/
│   │   ├── config/
│   │   ├── context/
│   │   ├── data/
│   │   ├── domain/
│   │   ├── pages/
│   │   └── test/
│   └── ...
│
└── backend/
    ├── app/
    │   ├── api/
    │   ├── core/
    │   ├── db/
    │   ├── models/
    │   ├── repositories/
    │   ├── schemas/
    │   ├── scripts/
    │   └── services/
    ├── migrations/
    └── tests/
```

---

# 2. Charte graphique

La charte graphique du frontend d'origine est conservée sur les écrans publics et l'administration.

## Couleurs principales

- Fond clair principal : `#FAF7F5`
- Surface claire secondaire : `#F2EAEC`
- Texte principal : `#16111A`
- Accent prune : `#5B2A4E`
- Accent rose : `#E8B4C8`

Le projet possède également des tokens dédiés au mode sombre ainsi que des couleurs sémantiques pour les états de succès, d'avertissement et d'erreur.

## Polices

- Titres et éléments éditoriaux : **Cormorant Garamond**
- Texte, formulaires, navigation et interface : **Jost**

## Responsive

Les interfaces publiques et le back-office sont conçus pour fonctionner sur :

- mobile ;
- tablette ;
- desktop.

Le back-office utilise une navigation compacte sur mobile et une sidebar sur desktop. Les tableaux importants possèdent un rendu adapté aux petits écrans.

---

# 3. Fonctionnalités publiques déjà fonctionnelles

## 3.1 Accueil et navigation

L'application possède une page d'accueil, une navigation par catégories et des routes dédiées aux fiches produits, favoris, commande et livraison.

Le frontend utilise actuellement `HashRouter`.

## 3.2 Catalogue

Le catalogue public est maintenant alimenté par l'API FastAPI.

Le frontend utilise un `CatalogProvider` qui charge les produits depuis le backend.

Un fallback vers le catalogue local historique est conservé lorsque l'API est indisponible. Ce fallback sert principalement à maintenir la boutique exploitable pendant la transition.

Le backend gère :

- catégories ;
- produits ;
- couleurs ;
- tailles ;
- variantes ;
- images ;
- stock.

Les 26 produits historiques peuvent être importés avec le script de seed.

## 3.3 Recherche, filtres et tri

Les pages catalogue supportent notamment :

- catégorie ;
- nouveauté ;
- couleur ;
- taille ;
- prix minimum ;
- prix maximum ;
- recherche texte ;
- tri ;
- pagination côté API.

Le frontend conserve également ses filtres d'affichage.

## 3.4 Fiche produit

La fiche produit prend en charge :

- nom ;
- prix ;
- description ;
- matière ;
- couleurs ;
- tailles ;
- quantité ;
- stock disponible ;
- ajout au panier ;
- favoris ;
- guide des tailles ;
- informations de livraison ;
- produits associés ;
- galerie d'images.

Les tailles indisponibles sont désactivées pour la couleur sélectionnée.

Une variante qui n'a plus de stock ne peut pas être ajoutée au panier.

## 3.5 Galerie d'images

Les images d'un produit peuvent être :

- communes au produit ;
- associées à une couleur ;
- ordonnées ;
- marquées comme image principale ;
- accompagnées d'un texte alternatif.

Sur la fiche produit, la galerie privilégie les images de la couleur sélectionnée puis complète avec les images génériques.

Si aucune image réelle n'est disponible, le frontend peut utiliser l'illustration provisoire historique.

## 3.6 Panier

Le panier invité fonctionne côté frontend.

Il est conservé dans `localStorage`.

Une ligne de panier est identifiée par la combinaison :

```text
produit + couleur + taille
```

Le panier sait :

- ajouter un article ;
- modifier la quantité ;
- supprimer une ligne ;
- vider le panier ;
- calculer le sous-total.

Le panier n'est pas encore persisté côté serveur.

## 3.7 Favoris

Les favoris fonctionnent actuellement côté navigateur avec `localStorage`.

Ils ne sont pas encore associés à un compte client.

## 3.8 Thème clair / sombre

Le thème clair et sombre est fonctionnel.

Le thème respecte les tokens graphiques du projet et la préférence est mémorisée localement.

## 3.9 Contrôle 18+

L'univers réservé aux adultes possède un contrôle d'âge côté frontend.

La validation est conservée dans `sessionStorage`.

---

# 4. Checkout actuel

L'interface de checkout existe et permet de saisir notamment :

- nom ;
- téléphone ;
- email ;
- ville ;
- quartier ;
- adresse ou point de repère ;
- emballage neutre.

La présentation des moyens de paiement existe également.

Cependant, le checkout n'est pas encore relié à un vrai service de commande et de paiement.

À ce stade :

- aucune commande métier complète n'est créée ;
- le stock n'est pas encore réservé pendant le checkout ;
- aucun paiement Mobile Money ou carte n'est exécuté ;
- le suivi de commande client n'est pas encore disponible.

C'est le principal bloc fonctionnel restant avant une première livraison.

---

# 5. Administration déjà fonctionnelle

L'administration est accessible via des routes protégées.

## 5.1 Authentification administrateur

Le backend possède :

- comptes administrateurs ;
- mots de passe Argon2 ;
- authentification JWT ;
- route de connexion ;
- dépendance de protection des endpoints administrateur ;
- script de création du premier administrateur.

Le frontend possède un écran de connexion et conserve le jeton administrateur pour appeler l'API.

## 5.2 Dashboard

Le dashboard présente les principaux indicateurs du catalogue, notamment :

- produits ;
- variantes ;
- stock ;
- produits ou variantes en rupture ;
- stocks faibles.

## 5.3 Catégories

Le back-office permet :

- création ;
- modification ;
- activation / désactivation ;
- suppression selon les règles du backend.

## 5.4 Produits

Le back-office permet :

- création ;
- modification ;
- suppression ;
- activation / désactivation ;
- marquage nouveauté ;
- prix ;
- description ;
- matière ;
- catégorie ;
- type.

## 5.5 Référentiels couleurs et tailles

Les couleurs et tailles ne sont plus limitées aux valeurs historiques.

L'administrateur peut gérer :

- création ;
- modification ;
- activation / désactivation ;
- ordre d'affichage.

Une couleur peut contenir une valeur hexadécimale.

La suppression est protégée lorsqu'une valeur est encore utilisée par une variante.

## 5.6 Variantes

Une variante représente une déclinaison vendable d'un produit.

Elle peut contenir :

- couleur ;
- taille ;
- SKU ;
- prix spécifique ;
- état actif / inactif ;
- stock ;
- quantité réservée.

L'administrateur peut créer et modifier ces variantes.

## 5.7 Stock

Le stock est porté par la variante, pas par le produit global.

Les modifications de stock passent par `InventoryService`.

Le service :

- verrouille la variante pendant l'ajustement ;
- empêche une sortie de stock incompatible avec la quantité réservée ;
- journalise chaque mouvement ;
- évite la modification directe du stock depuis l'interface.

Le verrou PostgreSQL utilise maintenant un `FOR UPDATE` ciblé uniquement sur `product_variants`, afin d'éviter les erreurs liées aux jointures externes.

## 5.8 Historique de stock

L'administration permet de consulter les mouvements d'inventaire avec notamment :

- date ;
- quantité ajoutée ou retirée ;
- stock après mouvement ;
- motif ;
- référence ;
- type de mouvement.

## 5.9 Images produits

L'administration permet :

- upload d'image ;
- suppression ;
- définition de l'image principale ;
- modification de l'ordre ;
- texte alternatif ;
- association à une couleur.

Les fichiers médias sont actuellement servis par le backend sous `/media/...`.

Le frontend utilise une fonction centralisée de résolution des URLs backend.

---

# 6. Backend et architecture technique fonctionnels

## 6.1 API versionnée

Les routes métier sont regroupées sous :

```text
/api/v1
```

## 6.2 Health checks

Le backend dispose de points de contrôle pour :

- disponibilité de l'application ;
- disponibilité de la base de données.

## 6.3 Base de données

Le projet utilise PostgreSQL avec SQLAlchemy 2.

Les évolutions de schéma passent par Alembic.

Les migrations doivent toujours être appliquées avec :

```bash
alembic upgrade head
```

## 6.4 Organisation backend

La logique est séparée en plusieurs couches :

```text
endpoint
  ↓
service
  ↓
repository
  ↓
database
```

Le but est d'éviter de placer la logique métier directement dans les routes FastAPI.

## 6.5 Erreurs et logs

Le backend possède :

- format d'erreur homogène ;
- identifiant de requête ;
- logs HTTP ;
- méthode ;
- route ;
- code HTTP ;
- durée ;
- journalisation des exceptions.

## 6.6 CORS

Les origines frontend autorisées sont définies par configuration.

La configuration de production ne doit pas utiliser une origine globale `*`.

---

# 7. Tests et qualité

## Frontend

Le projet contient des tests automatisés pour les premières fonctions critiques, notamment :

- panier ;
- catalogue ;
- normalisation API ;
- filtres du catalogue.

Commandes :

```bash
npm run lint
npm run test:run
npm run build
```

## Backend

Le backend utilise Pytest.

Les tests couvrent notamment :

- health checks ;
- administration ;
- catalogue ;
- stock ;
- repository d'inventaire ;
- comportement du verrou PostgreSQL.

À la dernière vérification du correctif de stock, la suite backend comportait 17 tests passants.

Commande :

```bash
pytest
```

---

# 8. Ce qui n'est pas encore terminé

Les éléments suivants ne doivent pas être considérés comme fonctionnels pour une livraison client :

- création réelle d'une commande depuis le checkout ;
- cycle de statuts d'une commande ;
- gestion des commandes dans l'administration ;
- réservation du stock pendant une commande ;
- restitution du stock après annulation ;
- paiement Mobile Money réel ;
- paiement par carte réel ;
- webhooks de paiement ;
- suivi d'une commande côté client ;
- comptes clients ;
- carnet d'adresses client ;
- historique des commandes client ;
- newsletter persistée en base ;
- configuration complète des zones et frais de livraison ;
- notifications de commande ;
- pages légales et conditions de vente définitives ;
- déploiement production final ;
- sauvegardes et supervision production ;
- remplacement complet des contenus et images de démonstration.

Le détail des travaux restant pour obtenir une V1 livrable se trouve dans le fichier Excel associé au projet.

---

# 9. Principes pour la première version livrable

Pour la V1, une fonctionnalité ne doit pas être affichée comme disponible si son traitement réel n'existe pas.

Exemples :

- masquer le paiement carte tant qu'un prestataire réel n'est pas intégré ;
- masquer un Mobile Money non fonctionnel ;
- ne jamais afficher une commande comme payée sur la seule base d'une réponse frontend ;
- recalculer les prix et frais côté serveur ;
- vérifier le stock côté serveur au moment de la commande ;
- utiliser des opérations idempotentes pour les paiements et créations sensibles.

La V1 peut fonctionner avec commande sans compte client. Les comptes clients peuvent être ajoutés après le premier cycle de livraison si le périmètre doit rester court.

---

# 10. Démarrage local

## Backend

```bash
cd backend
pip install -e ".[dev]"
alembic upgrade head
pytest
uvicorn app.main:app --reload
```

Pour charger le catalogue de démonstration :

```bash
python -m app.scripts.seed_catalog
```

Pour créer le premier administrateur :

```bash
python -m app.scripts.create_admin --email admin@myintimy.com --password "MOT_DE_PASSE" --name "Administrateur Myintimy"
```

## Frontend

```bash
cd frontend
npm install
npm run lint
npm run test:run
npm run build
npm run dev
```

---

# 11. Variables d'environnement

Ne jamais versionner les vrais fichiers `.env`.

Conserver uniquement les fichiers `.env.example`.

Les valeurs sensibles à protéger comprennent notamment :

- URL de base de données ;
- clé JWT ;
- identifiants de prestataire de paiement ;
- secrets de webhook ;
- accès éventuels au stockage média ;
- clés d'envoi email / SMS / WhatsApp.

---

# 12. Prochaine étape recommandée

La prochaine étape prioritaire est le **module Commandes** :

1. modèle et migrations ;
2. création transactionnelle d'une commande ;
3. snapshot des prix et variantes ;
4. réservation de stock ;
5. statuts et historique ;
6. intégration du checkout ;
7. administration des commandes ;
8. annulation et restitution du stock.

Le paiement doit être branché après ce socle, et non l'inverse.
