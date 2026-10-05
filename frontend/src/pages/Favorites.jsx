import { Link } from "react-router-dom";
import { PRODUCTS } from "../data/catalog.js";
import { EmptyState, PageHead, ProductCard, ProductGrid } from "../components/Shared.jsx";
import { useShop } from "../context/ShopContext.jsx";

export default function Favorites() {
  const { favs } = useShop();
  const list = PRODUCTS.filter((p) => favs.includes(p.id));
  return (
    <>
      <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Favoris" }]} title={<>Vos <span className="ital">favoris</span></>}>Les pièces que vous avez mises de côté.</PageHead>
      <section className="wrap pb-28">
        <ProductGrid>
          {list.length ? list.map((p) => <ProductCard key={p.id} product={p} />) : (
            <EmptyState title="Aucun favori pour l’instant" text="Touchez le cœur d’une pièce pour la retrouver ici.">
              <Link to="/categorie/nouveautes" className="btn btn-ghost">Voir les nouveautés</Link>
            </EmptyState>
          )}
        </ProductGrid>
      </section>
    </>
  );
}
