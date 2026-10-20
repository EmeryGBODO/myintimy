import { useEffect } from "react";
import { Route, Routes, useLocation, useParams } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import { CartDrawer, MobileMenu, SearchModal, SizeGuide, Toast } from "./components/Overlays.jsx";
import { useCatalog } from "./catalog/catalog-context.js";
import { useShop } from "./context/shop-context";
import Home from "./pages/Home.jsx";
import Category from "./pages/Category.jsx";
import Product from "./pages/Product.jsx";
import Favorites from "./pages/Favorites.jsx";
import Checkout from "./pages/Checkout.jsx";
import Delivery from "./pages/Delivery.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import Legal from "./pages/Legal.jsx";
import Returns from "./pages/Returns.jsx";
import Contact from "./pages/Contact.jsx";
import NotFound from "./pages/NotFound.jsx";
import AccountLayout from "./account/AccountLayout.jsx";
import AccountLogin from "./pages/account/AccountLogin.jsx";
import AccountRegister from "./pages/account/AccountRegister.jsx";
import { ForgotPassword, ResetPassword } from "./pages/account/AccountPassword.jsx";
import AccountProfile from "./pages/account/AccountProfile.jsx";
import AccountAddresses from "./pages/account/AccountAddresses.jsx";
import AccountOrders from "./pages/account/AccountOrders.jsx";
import AccountOrderDetail from "./pages/account/AccountOrderDetail.jsx";
import AdminRoutes from "./admin/AdminRoutes.jsx";
import { applySeo, getSeoMetadata } from "./utils/seo.js";

/* `key` remet la page à zéro (filtres, taille choisie…) quand on change de catégorie ou de produit */
function CategoryRoute() {
  const { cat } = useParams();
  const { hasCategory } = useCatalog();
  return hasCategory(cat) ? <Category key={cat} cat={cat} /> : <NotFound />;
}
function ProductRoute() {
  const { id } = useParams();
  return <Product key={id} id={id} />;
}

/* À chaque navigation : retour en haut, fermeture des panneaux et mise à jour SEO */
function RouteEffects() {
  const { pathname } = useLocation();
  const { closePanel } = useShop();
  const { categories, getProduct } = useCatalog();

  useEffect(() => {
    window.scrollTo(0, 0);
    closePanel();

    let product = null;
    let category = null;

    if (pathname.startsWith("/produit/")) {
      const id = pathname.replace("/produit/", "");
      product = getProduct(id);
    } else if (pathname.startsWith("/categorie/")) {
      const cat = pathname.replace("/categorie/", "");
      category = categories?.[cat];
    }

    const meta = getSeoMetadata(pathname, { product, category });
    applySeo(meta);
  }, [pathname, closePanel, categories, getProduct]);

  return null;
}

export default function App() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return <AdminRoutes />;
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
          <Route path="/cgv" element={<Terms />} />
          <Route path="/confidentialite" element={<Privacy />} />
          <Route path="/mentions-legales" element={<Legal />} />
          <Route path="/retours" element={<Returns />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/compte/connexion" element={<AccountLogin />} />
          <Route path="/compte/inscription" element={<AccountRegister />} />
          <Route path="/compte/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/compte/reinitialiser" element={<ResetPassword />} />
          <Route path="/compte" element={<AccountLayout />}>
            <Route index element={<AccountProfile />} />
            <Route path="adresses" element={<AccountAddresses />} />
            <Route path="commandes" element={<AccountOrders />} />
            <Route path="commandes/:reference" element={<AccountOrderDetail />} />
          </Route>
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
