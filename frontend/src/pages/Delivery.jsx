import { Link } from "react-router-dom";
import { PageHead, Perks } from "../components/Shared.jsx";
import { formatPrice } from "../data/catalog.js";

const SHIPPING_ZONES = [
  {
    name: "Cotonou & proximité immédiate",
    details: "Cotonou intra-muros, Haie Vive, Cadjehoun, Akpakpa, Fidjrossè, Agla",
    time: "24 heures",
    price: 1500,
  },
  {
    name: "Grande agglomération littorale",
    details: "Abomey-Calavi, Godomey, Cocotomey, Sèmè-Kpodji",
    time: "24 à 48 heures",
    price: 2000,
  },
  {
    name: "Villes secondaires du Sud",
    details: "Porto-Novo, Ouidah, Allada, Pahou",
    time: "24 à 48 heures",
    price: 2500,
  },
  {
    name: "Centre & Nord Bénin",
    details: "Bohicon, Abomey, Lokossa, Parakou, Natitingou et autres localités",
    time: "48 à 72 heures",
    price: 3000,
  },
];

export default function Delivery() {
  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Livraison discrète" }]}
        title={<>Livraison <span className="ital">discrète</span></>}
      >
        Chaque commande voyage dans un écrin neutre, sans logo extérieur ni mention du contenu, livrée en mains propres partout au Bénin.
      </PageHead>

      <section className="wrap max-w-[920px] pb-24 pt-4 text-[15px] leading-relaxed">
        {/* Engagement discrétion */}
        <div className="mb-12 border border-line bg-surface p-6 sm:p-8">
          <p className="eyebrow mb-2">Notre engagement de discrétion absolue</p>
          <h2 className="font-display text-2xl font-light text-fg sm:text-3xl">
            Un colis 100 % neutre et confidentiel
          </h2>
          <p className="mt-3 text-muted">
            Chez Myintimy, nous savons combien la lingerie fine et les objets d'intimité touchent à votre sphère privée.
            Nous appliquons un protocole rigoureux pour chaque expédition :
          </p>
          <ul className="mt-4 grid gap-2.5 text-sm text-muted sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="text-accent" aria-hidden="true">✦</span>
              <span><strong>Colis vierge :</strong> Carton ou pochette opaque sans aucun logo ni nom de marque.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent" aria-hidden="true">✦</span>
              <span><strong>Écrin intérieur :</strong> Pièces enveloppées dans du papier de soie et une pochette satinée.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent" aria-hidden="true">✦</span>
              <span><strong>Transporteur discret :</strong> Le livreur ignore la nature exacte des articles transportés.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent" aria-hidden="true">✦</span>
              <span><strong>Appel préalable :</strong> Vous êtes contacté avant le passage pour convenir du lieu exact.</span>
            </li>
          </ul>
        </div>

        {/* Grille des tarifs et zones */}
        <div className="mb-14">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Tarifs & Délais</p>
              <h2 className="font-display text-3xl font-light text-fg">Zones de livraison au Bénin</h2>
            </div>
            <div className="border border-accent/20 bg-accent/5 px-3 py-1.5 font-sans text-xs text-accent">
              Livraison offerte dès 50 000 FCFA d'achats
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SHIPPING_ZONES.map((zone) => (
              <article key={zone.name} className="border border-line bg-bg p-5 transition-colors hover:border-line-strong">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-fg">{zone.name}</h3>
                  <span className="font-sans text-sm font-semibold tabular-nums text-accent">
                    {formatPrice(zone.price)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted leading-normal">{zone.details}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-muted">
                  <span>Délai moyen d'acheminement :</span>
                  <strong className="text-fg">{zone.time}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Modalités pratiques */}
        <div className="mb-14 space-y-8">
          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Règlement à la livraison</h2>
            <p className="text-muted">
              Le paiement de votre commande et des frais d'expédition s’effectue en espèces directement auprès du coursier à la remise en main propre.
              Nous vous recommandons de préparer l'appoint si possible pour faciliter la transaction.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Lieu de livraison flexible</h2>
            <p className="text-muted">
              Vous pouvez choisir de vous faire livrer à votre domicile, à votre bureau, ou convenir d’un point de repère public facilement accessible
              (carrefour, pharmacie, station). N'hésitez pas à préciser tout détail utile dans le champ « Adresse ou repère » lors du{" "}
              <Link to="/commande" className="underline hover:text-fg">passage de commande</Link>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Un doute sur la taille ou un échange ?</h2>
            <p className="text-muted">
              Si un article ne vous convient pas, vous disposez de 14 jours pour demander un échange ou un retour.
              Pour connaître l'ensemble des conditions, consultez notre politique de{" "}
              <Link to="/retours" className="underline hover:text-fg">Retours & Remboursements</Link>.
            </p>
          </div>
        </div>

        {/* Les engagements Myintimy */}
        <Perks />
      </section>
    </>
  );
}
