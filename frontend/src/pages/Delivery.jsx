import { PageHead, Perks } from "../components/Shared.jsx";

export default function Delivery() {
  return (
    <>
      <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Livraison & retours" }]} title={<>Livraison <span className="ital">discrète</span></>}>
        Chaque commande est préparée à la main, glissée dans une pochette en satin puis dans un carton neutre, sans logo ni description du contenu.
      </PageHead>
      <section className="wrap pb-28 pt-5"><Perks /></section>
    </>
  );
}
