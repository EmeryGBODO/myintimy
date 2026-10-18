# Recette E2E Myintimy

Cette recette couvre automatiquement le parcours COD complet :

`catalogue → produit → panier → checkout → commande → administration → préparation → expédition → livraison`

Elle vérifie aussi côté serveur :

- la vraie référence de commande ;
- le statut COD ;
- la vidange du panier uniquement après succès ;
- les transitions administrateur ;
- l'historique de commande ;
- la diminution du stock physique à l'expédition ;
- la libération de la quantité réservée ;
- le mouvement `order_shipment`.

## Pré-requis

- PostgreSQL accessible localement ;
- backend avec `.venv` fonctionnel ;
- script `app.scripts.verify_fresh_install` déjà présent ;
- Node/npm installés.

La base utilisée est **détruite puis recréée** avant chaque recette. Son nom doit contenir `test`, `qa` ou `fresh`.

## Installation Playwright

Depuis `frontend` :

```powershell
npm install
npx playwright install chromium
```

## Configuration PowerShell

Exemple :

```powershell
$env:MYINTIMY_E2E_DATABASE_URL="postgresql+psycopg://myintimy:myintimy@localhost:5432/myintimy_e2e_test"
```

Si le backend n'est pas dans `..\backend` :

```powershell
$env:MYINTIMY_E2E_BACKEND_DIR="C:\chemin\vers\myintimy\backend"
```

Si nécessaire, le Python du backend peut être imposé :

```powershell
$env:MYINTIMY_E2E_PYTHON="C:\chemin\vers\myintimy\backend\.venv\Scripts\python.exe"
```

Les identifiants admin E2E par défaut sont exclusivement destinés à la base de recette :

```text
e2e-admin@myintimy.local
E2E-only-Admin-42!
```

Ils peuvent être remplacés par `MYINTIMY_E2E_ADMIN_EMAIL` et `MYINTIMY_E2E_ADMIN_PASSWORD`.

## Exécution

```powershell
npm run test:e2e
```

Pour observer le navigateur :

```powershell
npm run test:e2e:headed
```

Le rapport HTML est généré dans `playwright-report/`.

## Mobile Money

La validation Mobile Money n'est volontairement pas simulée dans ce test : la confirmation opérateur/Kkiapay doit être testée avec une vraie transaction sandbox. Le scénario COD automatise le cycle métier de commande et de stock ; la recette Kkiapay complète la preuve de paiement externe.
