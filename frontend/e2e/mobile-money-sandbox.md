# Recette Mobile Money sandbox Kkiapay

Cette recette complète le test E2E automatisé COD. Elle doit être exécutée avec un compte marchand Kkiapay sandbox configuré.

## Préconditions

- `KKIAPAY_PUBLIC_KEY`, `KKIAPAY_PRIVATE_KEY`, `KKIAPAY_SECRET_KEY` configurées pour la sandbox ;
- webhook sandbox configuré vers `/api/v1/payments/kkiapay/webhook` ;
- `KKIAPAY_WEBHOOK_SECRET` identique côté Kkiapay et Myintimy ;
- une base de recette contenant du stock disponible ;
- backend et frontend démarrés en environnement de recette.

## Scénario nominal

1. Ouvrir un produit disponible.
2. Sélectionner une couleur et une taille en stock.
3. Ajouter une unité au panier.
4. Aller au checkout.
5. Renseigner les coordonnées et l'adresse.
6. Choisir `Mobile Money`.
7. Valider la commande.
8. Vérifier que Myintimy crée la commande en `pending_payment` et réserve le stock.
9. Dans le widget Kkiapay, utiliser un scénario sandbox de paiement réussi.
10. Effectuer la confirmation opérateur demandée par le parcours Kkiapay.
11. Vérifier que le frontend affiche la vérification sécurisée du paiement.
12. Vérifier que la commande passe à `confirmed` uniquement après vérification serveur.
13. Ouvrir la commande dans l'administration.
14. Vérifier `payment_status = paid`.
15. Faire passer la commande en `preparing`, puis `shipped`, puis `delivered`.
16. Vérifier qu'à l'expédition la réservation disparaît et que le stock physique diminue une seule fois.

## Contrôles obligatoires

- Le callback frontend seul ne confirme jamais la commande.
- Le montant retourné par Kkiapay correspond exactement au montant serveur.
- La méthode retournée correspond à Mobile Money.
- Le `partnerId` correspond à la transaction Myintimy.
- Un rejeu du même webhook ne modifie pas une seconde fois la commande ni le stock.
- Un webhook avec un secret incorrect est refusé.
- Aucun OTP/PIN opérateur n'apparaît dans les logs Myintimy.
- Une transaction `FAILED` libère la réservation selon les règles prévues.
- Une transaction expirée libère la réservation.
- Un succès reçu après expiration n'auto-confirme pas une commande dont le stock a été libéré : la commande passe en revue manuelle (`paid_review`).

## Preuves à conserver

Pour la recette V1, conserver au minimum :

- référence de commande Myintimy ;
- identifiant de transaction Kkiapay ;
- capture du statut final côté Kkiapay ;
- capture du détail commande côté admin ;
- extrait des logs backend contenant les IDs de corrélation, sans secret ;
- résultat de la réconciliation Kkiapay/Myintimy ;
- confirmation que le stock final est correct.

## Critère de réussite

La recette est validée lorsque le paiement sandbox est confirmé par Kkiapay, revérifié par le backend Myintimy, traité une seule fois et que la commande/stock restent cohérents jusqu'au statut `delivered`.
