# Myintimy

## État actuel du projet

Myintimy est une boutique e-commerce React reliée à un backend FastAPI/PostgreSQL.

À ce stade, les principaux blocs déjà fonctionnels sont :

- catalogue public dynamique ;
- catégories, produits, couleurs, tailles et variantes ;
- galerie d'images produit ;
- panier invité ;
- favoris invités et favoris client ;
- authentification administrateur ;
- back-office catalogue ;
- gestion du stock et historique des mouvements ;
- création réelle des commandes ;
- réservation et consommation du stock ;
- gestion des statuts de commande ;
- paiement à la livraison ;
- administration des commandes ;
- comptes clients ;
- carnet d'adresses ;
- historique des commandes client ;
- profil client ;
- mécanisme de réinitialisation du mot de passe.

Les principaux chantiers restant avant une première version livrable concernent maintenant :

- l'envoi réel des e-mails transactionnels ;
- l'intégration Mobile Money ;
- les webhooks de paiement ;
- la configuration complète de la livraison ;
- les contenus définitifs ;
- les pages légales ;
- la recette complète ;
- le déploiement et l'exploitation en production.

Ce document décrit uniquement ce qui est réellement implémenté dans le projet et les limites encore connues.

---

# 1. Stack technique

## Frontend

- React 18
- Vite
- React Router avec `HashRouter`
- Tailwind CSS
- Vitest
- React Testing Library
- ESLint

## Backend

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic
- Pytest
- JWT administrateur
- JWT client
- Argon2 pour le stockage sécurisé des mots de passe

## Structure générale

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

La charte graphique du frontend d'origine est conservée sur les écrans publics et dans l'administration.

## Couleurs principales

- Fond clair principal : `#FAF7F5`
- Surface claire secondaire : `#F2EAEC`
- Texte principal : `#16111A`
- Accent prune : `#5B2A4E`
- Accent rose : `#E8B4C8`

Le projet possède également :

- un mode sombre ;
- des tokens de couleurs partagés ;
- des couleurs sémantiques pour les états succès, avertissement et erreur.

Les nouvelles interfaces ne doivent pas introduire de blanc pur, noir pur ou palette générique sans passer par les tokens du projet.

## Polices

- Titres et éléments éditoriaux : **Cormorant Garamond**
- Texte, formulaires, navigation et interface : **Jost**

## Responsive

Les interfaces publiques et le back-office sont conçus pour fonctionner sur :

- mobile ;
- tablette ;
- desktop.

Le back-office utilise :

- une navigation compacte sur mobile ;
- une sidebar sur desktop ;
- des cartes sur petits écrans lorsque les tableaux deviennent difficiles à lire ;
- des formulaires fluides et adaptés aux petites largeurs.

---

# 3. Catalogue public

## 3.1 Chargement du catalogue

Le catalogue public est alimenté par l'API FastAPI.

Le frontend utilise un `CatalogProvider` qui charge les données depuis le backend.

Un fallback vers le catalogue local historique est encore conservé pendant la transition, principalement pour éviter qu'une indisponibilité du backend ne rende toute la boutique inutilisable en développement.

Le backend gère :

- catégories ;
- produits ;
- couleurs ;
- tailles ;
- variantes ;
- images ;
- stock.

Les 26 produits historiques peuvent être chargés avec le script de seed.

## 3.2 Recherche, filtres et tri

L'API catalogue supporte notamment :

- catégorie ;
- nouveauté ;
- couleur ;
- taille ;
- prix minimum ;
- prix maximum ;
- recherche texte ;
- tri ;
- pagination.

Le frontend permet également de filtrer et trier les résultats.

## 3.3 Fiche produit

La fiche produit prend en charge :

- nom ;
- prix ;
- description ;
- matière ;
- couleurs ;
- tailles ;
- quantité ;
- disponibilité ;
- ajout au panier ;
- favoris ;
- guide des tailles ;
- informations de livraison ;
- produits associés ;
- galerie d'images.

Les tailles sans stock pour la couleur sélectionnée sont désactivées.

Une variante indisponible ne peut pas être ajoutée au panier.

---

# 4. Images produits

Les images d'un produit peuvent être :

- communes au produit ;
- associées à une couleur ;
- ordonnées ;
- définies comme image principale ;
- accompagnées d'un texte alternatif.

L'administration permet :

- upload ;
- suppression ;
- changement d'ordre ;
- modification du texte alternatif ;
- association à une couleur ;
- choix de l'image principale.

La première image dans l'ordre est utilisée comme image principale.

Sur la fiche produit, la galerie privilégie :

1. les images associées à la couleur sélectionnée ;
2. les images génériques du produit.

Si aucune image réelle n'est disponible, le frontend peut encore utiliser l'illustration historique de démonstration.

Les médias sont actuellement servis par le backend sous `/media/...`.

---

# 5. Panier

Le panier invité fonctionne côté frontend et est conservé dans `localStorage`.

Une ligne de panier est identifiée par :

```text
produit + couleur + taille
```

Le panier permet :

- ajout d'un article ;
- modification de quantité ;
- suppression d'une ligne ;
- vidage du panier ;
- calcul du sous-total.

Les identifiants des variantes sont utilisés lors de la création réelle de la commande côté backend.

---

# 6. Favoris

Deux modes existent maintenant.

## Visiteur

Les favoris sont conservés dans `localStorage`.

## Client connecté

Les favoris sont persistés côté serveur.

Lors de la connexion, les favoris locaux peuvent être fusionnés avec ceux déjà présents sur le compte client sans créer de doublons.

---

# 7. Checkout et commandes

## 7.1 Checkout réel

Le checkout n'est plus simulé.

Il permet de saisir notamment :

- nom ;
- téléphone ;
- email ;
- ville ;
- quartier ;
- adresse ou point de repère ;
- emballage neutre.

Lors de la validation :

1. le frontend envoie les variantes et quantités au backend ;
2. le backend relit les variantes réelles ;
3. les prix sont recalculés côté serveur ;
4. les frais de livraison sont recalculés côté serveur ;
5. le stock est vérifié ;
6. les quantités sont réservées ;
7. la commande est créée ;
8. une vraie référence de commande est retournée ;
9. le panier est vidé uniquement après succès.

Le frontend ne fait donc plus confiance aux prix envoyés par le navigateur.

## 7.2 Paiement actuellement actif

Le moyen de paiement réellement utilisable actuellement est :

```text
Paiement à la livraison
```

Les moyens non encore intégrés réellement, notamment Mobile Money et carte bancaire, ne doivent pas être présentés comme fonctionnels.

## 7.3 Statuts de commande

Le cycle actuel comprend notamment :

```text
confirmed
   ↓
preparing
   ↓
shipped
   ↓
delivered
```

L'annulation est possible avant expédition selon les règles métier.

Chaque changement de statut est historisé.

## 7.4 Gestion du stock pendant une commande

À la création de la commande, le stock est réservé.

Exemple :

```text
stock physique : 12
réservé : 0
disponible : 12

commande de 2
        ↓

stock physique : 12
réservé : 2
disponible : 10
```

Lors d'une annulation avant expédition :

```text
réservé : 2
        ↓
réservé : 0
```

Lors de l'expédition :

```text
stock physique : 12
réservé : 2
        ↓
stock physique : 10
réservé : 0
```

La sortie physique est journalisée dans les mouvements de stock.

Les traitements sont conçus pour éviter qu'un même passage au statut `shipped` ne décrémente le stock plusieurs fois.

---

# 8. Comptes clients

## 8.1 Authentification

L'authentification client est distincte de l'authentification administrateur.

Le backend gère :

- inscription ;
- connexion ;
- JWT client ;
- profil ;
- modification du profil ;
- déconnexion côté frontend ;
- génération d'un token de réinitialisation de mot de passe ;
- consommation du token de reset.

Les mots de passe utilisent Argon2.

Le guest checkout reste disponible.

## 8.2 Réinitialisation du mot de passe

Le mécanisme backend est présent :

1. demande de reset ;
2. génération d'un token ;
3. token à usage unique ;
4. modification du mot de passe ;
5. invalidation du token.

Limite actuelle :

> l'envoi réel du lien par e-mail n'est pas encore branché.

Cette partie doit être terminée avant de considérer le flux reset password comme complet en production.

## 8.3 Profil

Le client connecté peut consulter et modifier les informations prévues dans son profil, notamment :

- nom ;
- téléphone ;
- email selon les règles du backend.

## 8.4 Carnet d'adresses

Le client peut :

- créer plusieurs adresses ;
- modifier une adresse ;
- supprimer une adresse ;
- définir une adresse par défaut ;
- réutiliser ses adresses au checkout.

## 8.5 Commandes client

Le client connecté dispose d'un espace permettant de consulter :

- la liste de ses commandes ;
- la référence ;
- le statut ;
- les montants ;
- les lignes ;
- le détail d'une commande.

Le backend vérifie qu'un client ne peut consulter que ses propres commandes.

Lorsqu'un client connecté effectue un achat, la commande est automatiquement rattachée à son compte.

---

# 9. Administration

L'administration est accessible via des routes protégées.

## 9.1 Authentification administrateur

Le backend possède :

- comptes administrateurs ;
- mots de passe Argon2 ;
- JWT administrateur ;
- route de connexion ;
- dépendances de protection des endpoints administrateur ;
- script de création du premier administrateur.

L'authentification administrateur reste séparée de l'authentification client.

## 9.2 Dashboard

Le dashboard présente notamment :

- produits ;
- variantes ;
- niveau de stock ;
- ruptures ;
- stocks faibles.

## 9.3 Catégories

Le back-office permet :

- création ;
- modification ;
- activation / désactivation ;
- suppression selon les règles métier.

## 9.4 Produits

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

## 9.5 Référentiels couleurs et tailles

L'administrateur peut gérer :

- création ;
- modification ;
- activation / désactivation ;
- ordre d'affichage.

Une couleur peut contenir une valeur hexadécimale.

La suppression est protégée lorsqu'une couleur ou une taille est encore utilisée par une variante.

## 9.6 Variantes

Une variante peut contenir :

- couleur ;
- taille ;
- SKU ;
- prix spécifique ;
- état actif / inactif ;
- stock ;
- quantité réservée.

Les variantes sont administrables depuis le back-office.

## 9.7 Stock

Le stock est porté par la variante.

Les modifications passent par `InventoryService`.

Le service :

- verrouille la variante pendant l'ajustement ;
- empêche les sorties incompatibles avec les réservations ;
- journalise chaque mouvement ;
- évite les modifications directes non tracées.

Le verrou PostgreSQL utilise un `FOR UPDATE` ciblé sur `product_variants`.

## 9.8 Historique de stock

L'administration affiche notamment :

- date ;
- quantité ajoutée ou retirée ;
- stock après mouvement ;
- motif ;
- référence ;
- type de mouvement.

## 9.9 Commandes

Le back-office permet maintenant :

- consultation de la liste des commandes ;
- recherche par référence/client/téléphone ;
- filtre par statut ;
- consultation du détail ;
- coordonnées client ;
- adresse de livraison ;
- lignes de commande ;
- montants ;
- mode de paiement ;
- historique de statut ;
- passage au statut suivant ;
- annulation lorsque la transition est autorisée.

---

# 10. Backend et architecture technique

## 10.1 API versionnée

Les routes métier utilisent :

```text
/api/v1
```

## 10.2 Health checks

Le backend expose des contrôles pour :

- disponibilité de l'application ;
- disponibilité de PostgreSQL.

## 10.3 Base de données

Le projet utilise PostgreSQL avec SQLAlchemy 2.

Les évolutions de schéma passent par Alembic.

Chaîne de migrations actuelle :

```text
0001
  ↓
0002
  ↓
0003_admin
  ↓
0004_orders
  ↓
0005_clients
```

Les migrations doivent être appliquées avec :

```bash
alembic upgrade head
```

## 10.4 Organisation backend

La logique est organisée suivant le principe :

```text
endpoint
  ↓
service
  ↓
repository
  ↓
database
```

La logique métier importante ne doit pas être placée directement dans les routes FastAPI.

## 10.5 Erreurs et logs

Le backend possède :

- format d'erreur homogène ;
- identifiant de requête ;
- logs HTTP ;
- méthode ;
- route ;
- code HTTP ;
- durée ;
- journalisation des exceptions.

## 10.6 CORS

Les origines frontend autorisées sont définies par configuration.

La configuration de production ne doit pas utiliser une origine globale `*`.

---

# 11. Tests et qualité

## Frontend

Le projet contient des tests notamment pour :

- panier ;
- catalogue ;
- normalisation des données API ;
- filtres catalogue.

Commandes de contrôle :

```bash
npm run lint
npm run test:run
npm run build
```

Ces commandes doivent être exécutées après chaque intégration de patch frontend.

## Backend

Le backend utilise Pytest.

Les tests couvrent maintenant notamment :

- health checks ;
- catalogue ;
- administration ;
- stock ;
- repository d'inventaire ;
- verrou PostgreSQL ;
- commandes ;
- réservation de stock ;
- annulation ;
- transitions ;
- comptes clients ;
- adresses ;
- favoris ;
- reset password ;
- rattachement d'une commande à un client.

Dernière validation connue :

```text
25 tests passants
```

Commande :

```bash
pytest
```

---

# 12. Fonctionnalités déjà considérées comme terminées

Les blocs suivants peuvent être considérés comme fonctionnels dans l'état actuel :

- catalogue public ;
- catégories ;
- produits ;
- couleurs ;
- tailles ;
- variantes ;
- images ;
- gestion du stock ;
- historique du stock ;
- panier invité ;
- favoris invités ;
- authentification administrateur ;
- administration catalogue ;
- dashboard admin ;
- création de commande ;
- recalcul serveur des montants ;
- réservation du stock ;
- statuts de commande ;
- annulation avant expédition ;
- consommation du stock à l'expédition ;
- liste des commandes admin ;
- détail et traitement d'une commande ;
- paiement à la livraison ;
- compte client : inscription et connexion ;
- profil client ;
- carnet d'adresses ;
- historique des commandes client ;
- détail des commandes client ;
- favoris persistés côté serveur ;
- fusion des favoris locaux et serveur.

---

# 13. Fonctionnalités encore à terminer pour la V1

## Priorité immédiate

### E-mails transactionnels

À ajouter :

- e-mail de reset password ;
- confirmation de commande ;
- notification interne nouvelle commande ;
- éventuellement notification des changements de statut.

### Paiement Mobile Money

À faire :

- choix du prestataire ;
- abstraction `PaymentService` ;
- initiation du paiement ;
- stockage des transactions ;
- vérification du statut ;
- webhook ;
- idempotence ;
- confirmation de commande côté serveur.

### Livraison

Le calcul des frais est déjà effectué côté serveur, mais la configuration reste à industrialiser.

À faire :

- zones de livraison administrables ;
- tarifs administrables ;
- seuil de gratuité configurable ;
- interface admin associée.

## Avant production

- remplacer les contenus de démonstration ;
- vérifier tous les produits, prix, SKU, stocks et images ;
- finaliser les pages légales ;
- finaliser CGV, confidentialité et politique de retour ;
- revue responsive complète ;
- revue clair/sombre complète ;
- audit accessibilité minimum ;
- durcissement sécurité ;
- configuration production ;
- stockage média persistant ;
- HTTPS ;
- sauvegardes PostgreSQL ;
- monitoring minimum ;
- recette de bout en bout.

---

# 14. Fonctionnalités volontairement non actives

Les fonctions suivantes ne doivent pas être affichées comme disponibles tant que leur intégration réelle n'existe pas :

- paiement carte bancaire ;
- Mobile Money ;
- promotions / coupons ;
- programme de fidélité ;
- avis produits ;
- marketplace multi-vendeur.

Une fonctionnalité visible côté client doit avoir un traitement backend réel.

---

# 15. Principes V1

Pour la V1 :

- le backend est la source de vérité pour les prix ;
- le backend est la source de vérité pour le stock ;
- le frontend ne peut pas décider qu'une commande est payée ;
- les paiements doivent être idempotents ;
- les webhooks doivent être vérifiés ;
- chaque transition de commande doit être contrôlée ;
- le stock doit rester traçable ;
- les secrets ne doivent jamais être versionnés ;
- le guest checkout peut cohabiter avec les comptes clients ;
- les interfaces doivent respecter la charte Myintimy ;
- les interfaces doivent fonctionner en clair et sombre ;
- les interfaces doivent être responsive.

---

# 16. Démarrage local

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
python -m app.scripts.create_admin \
  --email admin@myintimy.com \
  --password "MOT_DE_PASSE" \
  --name "Administrateur Myintimy"
```

Sous PowerShell, utiliser la commande sur une seule ligne si nécessaire.

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

# 17. Variables d'environnement

Ne jamais versionner les vrais fichiers `.env`.

Conserver uniquement les `.env.example`.

Les valeurs sensibles comprennent notamment :

- URL PostgreSQL ;
- clé JWT administrateur ;
- clé JWT client ;
- identifiants du prestataire de paiement ;
- secrets de webhook ;
- SMTP ou fournisseur d'e-mail ;
- accès au stockage média ;
- clés SMS ou WhatsApp éventuelles.

---

# 18. Prochaine étape recommandée

Le prochain bloc recommandé est :

```text
Service e-mail transactionnel
        ↓
Reset password réellement envoyé
        ↓
Confirmation de commande
        ↓
Notification administrateur
        ↓
PaymentService
        ↓
Mobile Money
        ↓
Webhook idempotent
```

Cela permet de terminer proprement le compte client avant d'ouvrir le chantier paiement.
