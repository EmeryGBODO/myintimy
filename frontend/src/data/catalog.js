// Catalogue Myintimy. Pour utiliser vos vraies photos, ajoutez `images: ["/photos/x-1.jpg", "/photos/x-2.jpg"]` à un produit :
// elles remplacent automatiquement les illustrations provisoires.

/** Coloris : `h` = teinte de la pièce, `bg` = dégradé de fond de l'illustration, `dark` = pièce foncée (traits clairs). */
export const COLORS = {
  noir:{n:"Noir",h:"#18121B",bg:["#F4E8EE","#D9C2D0"],dark:1},
  rose:{n:"Rose poudré",h:"#E9B7C9",bg:["#3D2037","#1E0F1D"],dark:0},
  prune:{n:"Prune",h:"#5B2A4E",bg:["#F7EFF4","#E1CDDB"],dark:1},
  ivoire:{n:"Ivoire",h:"#F4EDE5",bg:["#4B2B44","#22121E"],dark:0},
  bordeaux:{n:"Bordeaux",h:"#6D1F34",bg:["#F8EEEB","#E6CDD1"],dark:1},
  lilas:{n:"Lilas",h:"#C0A9D7",bg:["#2D1C37","#160D1C"],dark:0},
  champagne:{n:"Champagne",h:"#E9D4B7",bg:["#3B2731","#1C1117"],dark:0}
};

export const SIZES = ["XS", "S", "M", "L", "XL"];
const SZ = SIZES;

export const PRODUCTS = [
 { id: 1, category: "lingerie", type: "bra", name: "Soutien-gorge Séraphine", price: 38000, colors: ["noir","rose","prune"], sizes: SZ, tag: "Nouveau", isNew: true, description: "Dentelle de Calais posée sur un tulle invisible, armatures fines et bretelles réglables en satin. Un maintien léger qui dessine sans contraindre.", material: "Dentelle 88 % polyamide, 12 % élasthanne. Lavage à la main à 30 °C." },
 { id: 2, category: "lingerie", type: "brief", name: "Culotte Séraphine", price: 16000, colors: ["noir","rose","prune"], sizes: SZ, description: "La culotte assortie au soutien-gorge Séraphine, taille mi-haute et dos en dentelle festonnée.", material: "Dentelle 88 % polyamide, 12 % élasthanne. Fond 100 % coton." },
 { id: 3, category: "lingerie", type: "body", name: "Body Nocturne", price: 54000, colors: ["noir","bordeaux"], sizes: SZ, tag: "Best-seller", description: "Body en tulle brodé de motifs floraux, échancrure haute et dos plongeant. Se porte seul ou sous une veste.", material: "Tulle brodé 80 % polyamide, 20 % élasthanne. Lavage à la main." },
 { id: 4, category: "lingerie", type: "bra", name: "Ensemble Aube", price: 62000, colors: ["ivoire","champagne"], sizes: SZ, isNew: true, description: "Soutien-gorge et culotte en soie de mûrier bordés de dentelle de Leavers. Pensé pour les grandes occasions.", material: "Soie 100 % mûrier, dentelle de Leavers. Nettoyage délicat." },
 { id: 5, category: "lingerie", type: "bra", name: "Bralette Iris", price: 29000, colors: ["lilas","noir"], sizes: SZ, description: "Bralette sans armatures en dentelle élastique, ultra-confortable du matin au soir.", material: "Dentelle élastique 85 % polyamide, 15 % élasthanne." },
 { id: 6, category: "lingerie", type: "garter", name: "Porte-jarretelles Velours", price: 24000, colors: ["noir","bordeaux"], sizes: SZ, tag: "Nouveau", isNew: true, description: "Ceinture en velours souple, quatre jarretelles réglables et attaches dorées à l’or fin.", material: "Velours 90 % polyester, 10 % élasthanne. Attaches métal doré." },
 { id: 7, category: "lingerie", type: "brief", name: "Tanga Iris", price: 14000, colors: ["lilas","noir","rose"], sizes: SZ, description: "Tanga en dentelle élastique, bords sans couture invisibles sous les vêtements.", material: "Dentelle 85 % polyamide, 15 % élasthanne." },
 { id: 8, category: "lingerie", type: "corset", name: "Corset Opéra", price: 85000, colors: ["noir","prune"], sizes: SZ, tag: "Édition limitée", isNew: true, description: "Corset baleiné en satin duchesse, laçage au dos par ruban de soie. Numéroté, 60 pièces.", material: "Satin duchesse, baleines acier spiralé, doublure coton." },
 { id: 9, category: "vetements", type: "dress", name: "Robe slip Satine", price: 72000, colors: ["champagne","noir","prune"], sizes: SZ, isNew: true, tag: "Nouveau", description: "Robe en satin coupée en biais qui épouse le corps et tombe aux chevilles. Fines bretelles croisées au dos.", material: "Satin 100 % soie. Nettoyage à sec." },
 { id: 10, category: "vetements", type: "cami", name: "Caraco Lune", price: 32000, colors: ["ivoire","noir","rose"], sizes: SZ, description: "Caraco en crêpe de soie, bord de dentelle sous le décolleté. Sous une veste ou seul le soir.", material: "Crêpe de soie 100 %, dentelle de Calais." },
 { id: 11, category: "vetements", type: "kimono", name: "Kimono Orchidée", price: 68000, colors: ["prune","noir"], sizes: ["S/M","L/XL"], description: "Kimono long en satin imprimé ton sur ton, manches amples et ceinture à nouer.", material: "Satin 100 % polyester recyclé. Lavage délicat 30 °C." },
 { id: 12, category: "vetements", type: "dress", name: "Robe longue Opaline", price: 95000, colors: ["ivoire","bordeaux"], sizes: SZ, description: "Robe longue en mousseline doublée, dos nu et ceinture fine. La pièce du soir de la collection.", material: "Mousseline de soie, doublure satin." },
 { id: 13, category: "vetements", type: "cami", name: "Caraco Minuit", price: 36000, colors: ["noir","bordeaux"], sizes: SZ, description: "Caraco en satin, bustier entièrement en dentelle et bretelles fines réglables.", material: "Satin de soie, dentelle 88 % polyamide." },
 { id: 14, category: "nuit", type: "nuisette", name: "Nuisette Clair de lune", price: 45000, colors: ["rose","noir","ivoire"], sizes: SZ, tag: "Best-seller", description: "Nuisette en satin de soie, ourlet en dentelle et fente latérale. Une seconde peau pour la nuit.", material: "Satin 100 % soie, dentelle de Calais." },
 { id: 15, category: "nuit", type: "pyjama", name: "Pyjama Soie Prune", price: 78000, colors: ["prune","champagne"], sizes: SZ, isNew: true, description: "Chemise à col tailleur passepoilée et pantalon fluide, en soie lavée au toucher de pêche.", material: "Soie lavée 100 %. Lavage à la main." },
 { id: 16, category: "nuit", type: "kimono", name: "Peignoir Velours", price: 58000, colors: ["noir","bordeaux"], sizes: ["S/M","L/XL"], description: "Peignoir en velours de soie, revers châle et ceinture large. Doux comme une caresse.", material: "Velours 82 % viscose, 18 % soie." },
 { id: 17, category: "nuit", type: "nuisette", name: "Nuisette Rosée", price: 39000, colors: ["lilas","rose"], sizes: SZ, description: "Nuisette courte en voile de coton, fronces sous la poitrine et bretelles nouées.", material: "Voile 100 % coton, finitions dentelle." },
 { id: 18, category: "nuit", type: "pyjama", name: "Ensemble short Satin", price: 42000, colors: ["rose","noir"], sizes: SZ, description: "Top à manches courtes et short taille élastique en satin, liserés contrastés.", material: "Satin 100 % polyester. Lavage délicat 30 °C." },
 { id: 19, category: "couple", type: "oil", name: "Huile de massage Ylang & Vanille", price: 18000, colors: ["champagne"], sizes: null, isNew: true, tag: "Nouveau", description: "Huile sèche aux notes d’ylang-ylang et de vanille de Madagascar. Pénètre sans laisser de film gras.", material: "100 ml. Huiles d’amande douce et de jojoba. Usage externe." },
 { id: 20, category: "couple", type: "candle", name: "Bougie de massage Ambre", price: 22000, colors: ["prune","noir"], sizes: null, description: "Bougie à la cire de soja qui fond en une huile tiède à verser sur la peau. Notes d’ambre et de bois de santal.", material: "180 g, environ 30 heures. Cire de soja, beurre de karité." },
 { id: 21, category: "couple", type: "blindfold", name: "Masque en soie Secret", price: 15000, colors: ["noir","prune","rose"], sizes: null, description: "Masque en soie double épaisseur, lien satiné à nouer. Pour se laisser guider par les autres sens.", material: "Soie 100 % mûrier, rembourrage ouate." },
 { id: 22, category: "couple", type: "plume", name: "Plume de caresse", price: 12000, colors: ["rose","noir"], sizes: null, description: "Plume d’autruche montée sur un manche en bois laqué. Le geste le plus léger qui soit.", material: "Plume naturelle, manche hêtre laqué. 40 cm." },
 { id: 23, category: "couple", type: "game", name: "Jeu « 52 envies »", price: 19000, colors: ["bordeaux","noir"], sizes: null, tag: "Best-seller", description: "Un jeu de 52 cartes pour se découvrir à deux : confidences, défis tendres et invitations à oser.", material: "52 cartes illustrées, coffret aimanté. En français." },
 { id: 24, category: "couple", type: "massager", name: "Masseur intime Galet", price: 65000, colors: ["rose","lilas","noir"], sizes: null, isNew: true, description: "Masseur au toucher velouté en silicone médical, silencieux et étanche. Rechargeable par câble USB, livré dans sa pochette en satin.", material: "Silicone médical sans phtalates. Autonomie 2 h. Garantie 1 an." },
 { id: 25, category: "couple", type: "box", name: "Coffret Nuit à deux", price: 89000, colors: ["prune","noir"], sizes: null, tag: "Coffret", description: "Le coffret cadeau de la Maison : bougie Ambre, huile Ylang & Vanille, masque Secret et jeu « 52 envies ».", material: "Écrin rigide en papier gaufré, ruban de satin." },
 { id: 26, category: "couple", type: "oil", name: "Sérum de massage chauffant", price: 21000, colors: ["rose"], sizes: null, description: "Sérum qui réchauffe doucement la peau sous le souffle. Parfum de fleur de tiaré.", material: "50 ml. Base aloe vera. Usage externe." }
];

export const CATEGORIES = {
  lingerie:{ title: "Lingerie", subtitle: "Dentelles de Calais, tulles brodés et soies délicates, coupés pour révéler sans exposer." },
  vetements:{ title: "Vêtements", subtitle: "Des pièces fluides en soie et satin, à porter du jour jusqu’à tard le soir." },
  nuit:{ title: "Nuit & Détente", subtitle: "Satin, velours et soie lavée pour des soirées lentes et des réveils doux." },
  couple:{ title: "Univers Couple", subtitle: "Des objets choisis pour cultiver le désir et la complicité. Expédiés sous emballage neutre, sans mention de la marque." },
  nouveautes:{ title: "Nouveautés", subtitle: "Les dernières pièces arrivées à la Maison, collection Nocturne." }
};

export const FREE_SHIPPING = 50000;
export const CITIES = ["Cotonou", "Abomey-Calavi", "Porto-Novo", "Ouidah", "Bohicon", "Parakou", "Autre ville"];
export const shippingFee = (city, subtotal) => (subtotal >= FREE_SHIPPING ? 0 : city === "Cotonou" ? 1500 : 3000);

export const formatPrice = (n) => n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") + " FCFA";
export const getProduct = (id) => PRODUCTS.find((p) => p.id === Number(id));
