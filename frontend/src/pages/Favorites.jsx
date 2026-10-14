import { Link } from "react-router-dom";
import { useCatalog } from "../catalog/catalog-context.js";
import { EmptyState, PageHead, ProductCard, ProductGrid } from "../components/Shared.jsx";
import { useShop } from "../context/shop-context.js";

export default function Favorites() {
  const { favs } = useShop();
  const { products } = useCatalog();
  const list = products.filter((p) => favs.some((id) => String(id) === String(p.id)));
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
