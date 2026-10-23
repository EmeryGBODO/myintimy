export const DEFAULT_SEO = {
  title: "Myintimy — Maison de lingerie de luxe au Bénin",
  description: "Lingerie fine, vêtements de nuit fluides et objets de complicité. Livraison discrète partout au Bénin dans un écrin neutre.",
};

export const ROUTE_SEO = {
  "/": {
    title: "Myintimy — Lingerie fine & Objets de complicité au Bénin",
    description: "Maison de lingerie de luxe au Bénin. Dentelles précieuses, soies délicates et livraison 100% discrète à Cotonou et partout au Bénin.",
  },
  "/categorie/lingerie": {
    title: "Lingerie Fine & Dentelle — Myintimy",
    description: "Soutiens-gorge, culottes, bodies et ensembles en dentelle raffinée chez Myintimy. Confection délicate et coupes précises.",
  },
  "/categorie/vetements": {
    title: "Prêt-à-porter & Vêtements Fluides — Myintimy",
    description: "Kimonos de soie, robes et déshabillés élégants chez Myintimy. Des matières nobles pour sublimer chaque instant.",
  },
  "/categorie/nuit": {
    title: "Nuit & Détente — Myintimy",
    description: "Nuisettes en satin de soie, caracos et pyjamas raffinés pour vos soirées et moments de repos chez Myintimy.",
  },
  "/categorie/couple": {
    title: "Univers Couple (18+) — Myintimy",
    description: "Huiles de massage, bougies, accessoires en soie et jeux complices chez Myintimy pour cultiver le désir à deux.",
  },
  "/categorie/nouveautes": {
    title: "Nouveautés & Dernières Créations — Myintimy",
    description: "Découvrez les nouvelles créations de lingerie et de nuit de la collection Nocturne Automne 2026 chez Myintimy.",
  },
  "/favoris": {
    title: "Mes Favoris — Myintimy",
    description: "Retrouvez vos coups de cœur et pièces sélectionnées chez Myintimy.",
  },
  "/commande": {
    title: "Finaliser ma Commande — Myintimy",
    description: "Passez commande en toute discrétion. Livraison neutre et paiement sécurisé à la livraison au Bénin.",
  },
  "/livraison": {
    title: "Livraison Discrète & Délais — Myintimy",
    description: "Colis 100% neutre sans logo. Tarifs et délais pour Cotonou, Calavi, Porto-Novo, Parakou et tout le Bénin.",
  },
  "/retours": {
    title: "Retours sous 14 Jours & Remboursements — Myintimy",
    description: "Conditions d'hygiène, échanges de taille et modalités de retour simples et rapides chez Myintimy.",
  },
  "/cgv": {
    title: "Conditions Générales de Vente — Myintimy",
    description: "Conditions générales régissant les commandes sur la boutique en ligne Myintimy au Bénin.",
  },
  "/confidentialite": {
    title: "Politique de Confidentialité — Myintimy",
    description: "Engagement strict de discrétion et protection absolue de vos données personnelles chez Myintimy.",
  },
  "/mentions-legales": {
    title: "Mentions Légales — Myintimy",
    description: "Informations éditoriales, hébergement et propriété intellectuelle de la Maison Myintimy.",
  },
  "/contact": {
    title: "Conseil Privé & Contact — Myintimy",
    description: "Contactez notre équipe en confidence via WhatsApp ou e-mail pour tout conseil sur vos commandes chez Myintimy.",
  },
  "/compte/connexion": {
    title: "Connexion Espace Privé — Myintimy",
    description: "Accédez à votre compte Myintimy pour suivre vos commandes et gérer vos adresses de livraison.",
  },
  "/compte/inscription": {
    title: "Créer un Compte Privé — Myintimy",
    description: "Rejoignez le cercle Myintimy pour mémoriser vos adresses et favoris d'une visite à l'autre.",
  },
  "/compte": {
    title: "Mon Compte Privé — Myintimy",
    description: "Gestion de votre profil, carnet d'adresses et historique de commandes chez Myintimy.",
  },
};

export function getSeoMetadata(pathname, { product, category } = {}) {
  if (pathname && pathname.startsWith("/admin")) {
    return {
      title: "Administration — Myintimy",
      description: "Panneau d'administration réservé à la gestion de la boutique Myintimy.",
      noindex: true,
    };
  }

  if (product?.name) {
    return {
      title: `${product.name} — Myintimy`,
      description: product.description || `Découvrez ${product.name} chez Myintimy. Livraison discrète au Bénin.`,
      noindex: false,
    };
  }

  if (category?.title) {
    return {
      title: `${category.title} — Myintimy`,
      description: category.subtitle || `Collection ${category.title} chez Myintimy.`,
      noindex: false,
    };
  }

  const direct = ROUTE_SEO[pathname];
  if (direct) {
    return { ...direct, noindex: false };
  }

  return {
    ...DEFAULT_SEO,
    noindex: false,
  };
}

export function applySeo(meta) {
  if (typeof document === "undefined") return;

  const title = meta.title || DEFAULT_SEO.title;
  const description = meta.description || DEFAULT_SEO.description;

  // Title
  document.title = title;

  // Meta description
  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement("meta");
    descMeta.setAttribute("name", "description");
    document.head.appendChild(descMeta);
  }
  descMeta.setAttribute("content", description);

  // Open Graph Title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement("meta");
    ogTitle.setAttribute("property", "og:title");
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute("content", title);

  // Open Graph Description
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement("meta");
    ogDesc.setAttribute("property", "og:description");
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute("content", description);

  // Robots meta
  let robotsMeta = document.querySelector('meta[name="robots"]');
  if (meta.noindex) {
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute("content", "noindex, nofollow");
  } else if (robotsMeta) {
    robotsMeta.setAttribute("content", "index, follow");
  }
}
