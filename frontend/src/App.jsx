import { useEffect } from "react";
import { Route, Routes, useLocation, useParams } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import { CartDrawer, MobileMenu, SearchModal, SizeGuide, Toast } from "./components/Overlays.jsx";
import { useShop } from "./context/ShopContext.jsx";
import { CATEGORIES } from "./data/catalog.js";
import Home from "./pages/Home.jsx";
import Category from "./pages/Category.jsx";
import Product from "./pages/Product.jsx";
import Favorites from "./pages/Favorites.jsx";
import Checkout from "./pages/Checkout.jsx";
import Delivery from "./pages/Delivery.jsx";
import NotFound from "./pages/NotFound.jsx";

/* `key` remet la page à zéro (filtres, taille choisie…) quand on change de catégorie ou de produit */
function CategoryRoute() {
  const { cat } = useParams();
  return CATEGORIES[cat] ? <Category key={cat} cat={cat} /> : <NotFound />;
}
function ProductRoute() {
  const { id } = useParams();
  return <Product key={id} id={id} />;
}

/* À chaque navigation : retour en haut et fermeture des panneaux */
function RouteEffects() {
  const { pathname } = useLocation();
  const { closePanel } = useShop();
  useEffect(() => { window.scrollTo(0, 0); closePanel(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <RouteEffects />
      <Header />
      <main key={pathname} className="min-h-[60vh] animate-rise">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categorie/:cat" element={<CategoryRoute />} />
          <Route path="/produit/:id" element={<ProductRoute />} />
          <Route path="/favoris" element={<Favorites />} />
          <Route path="/commande" element={<Checkout />} />
          <Route path="/livraison" element={<Delivery />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <MobileMenu />
      <SearchModal />
      <SizeGuide />
      <Toast />
    </>
  );
}
