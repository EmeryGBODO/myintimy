# Myintimy — boutique React + Tailwind

## Démarrer
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # version de production dans dist/
```

## Organisation
- `src/data/catalog.js` : produits, coloris, catégories, frais de livraison, format des prix (FCFA).
- `src/data/art.js` : illustrations provisoires des produits (SVG).
- `src/context/ShopContext.jsx` : panier, favoris, thème clair/sombre, vérification d'âge, panneaux.
- `src/components/` : en-tête, pied de page, panier latéral, recherche, guide des tailles, porte 18+, cartes produit.
- `src/pages/` : Accueil, Catégorie, Fiche produit, Favoris, Commande, Livraison.
- `src/index.css` + `tailwind.config.js` : couleurs pilotées par variables CSS (modes clair et sombre).

## Mettre vos photos
Placez les images dans `public/photos/` puis ajoutez à un produit :
`images: ["/photos/seraphine-1.jpg", "/photos/seraphine-2.jpg", "/photos/seraphine-3.jpg"]`
(1re = vue principale, 2e = image au survol, 3e = vue supplémentaire). L'illustration provisoire disparaît automatiquement.

## À brancher avant la mise en ligne
- Paiement réel (Mobile Money / carte) : la commande est actuellement simulée dans `src/pages/Checkout.jsx`.
- Newsletter : le formulaire de l'accueil affiche seulement un message de confirmation.
- Numéro WhatsApp et réseaux sociaux dans `src/components/Footer.jsx`.
