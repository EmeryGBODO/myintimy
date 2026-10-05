import { Link, NavLink } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";
import { IconBag, IconHeart, IconMenu, IconMoon, IconSearch, IconSun } from "./Icons.jsx";

export const NAV = [
  { to: "/categorie/nouveautes", label: "Nouveautés" },
  { to: "/categorie/lingerie", label: "Lingerie" },
  { to: "/categorie/vetements", label: "Vêtements" },
  { to: "/categorie/nuit", label: "Nuit & Détente" },
  { to: "/categorie/couple", label: "Univers Couple", couple: true },
];

export function ThemeButton({ className = "" }) {
  const { isDark, toggleTheme } = useShop();
  return (
    <button onClick={toggleTheme} className={`icon-btn ${className}`} aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}>
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

const Badge = ({ n }) =>
  n > 0 ? <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent px-1 text-center font-sans text-[9.5px] font-medium leading-4 text-accent-fg">{n}</span> : null;

export default function Header() {
  const { cartCount, favs, openPanel } = useShop();
  return (
    <>
      <div className="bg-fg px-4 py-[11px] text-center font-sans text-[10.5px] font-normal uppercase leading-none tracking-[.24em] text-bg transition-colors duration-500">
        Livraison discrète offerte dès 50 000 FCFA · Emballage neutre, sans logo
      </div>
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-line bg-glass backdrop-blur-xl transition-colors duration-500">
        <div className="wrap grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[76px]">
          <div className="flex items-center">
            <button className="icon-btn xl:hidden" onClick={() => openPanel("menu")} aria-label="Ouvrir le menu"><IconMenu /></button>
            <nav className="hidden items-center gap-6 whitespace-nowrap xl:flex 2xl:gap-8" aria-label="Navigation principale">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => `lnk ${isActive ? "active" : ""} ${n.couple ? "text-accent" : ""}`}>{n.label}</NavLink>
              ))}
            </nav>
          </div>
          <Link to="/" className="whitespace-nowrap pl-[.32em] text-center font-display text-[22px] font-light uppercase leading-none tracking-[.32em] lg:pl-[.42em] lg:text-[30px] lg:tracking-[.42em]" aria-label="Myintimy, accueil">
            Myintimy
            <small className="mt-[7px] hidden pl-[.5em] font-sans text-[8.5px] font-normal tracking-[.5em] text-muted lg:block">Maison de lingerie</small>
          </Link>
          <div className="flex items-center justify-end gap-1">
            <button className="icon-btn" onClick={() => openPanel("search")} aria-label="Rechercher"><IconSearch /></button>
            <ThemeButton className="hidden sm:grid" />
            <Link to="/favoris" className="icon-btn relative hidden sm:grid" aria-label="Favoris"><IconHeart /><Badge n={favs.length} /></Link>
            <button className="icon-btn relative" onClick={() => openPanel("cart")} aria-label="Panier"><IconBag /><Badge n={cartCount} /></button>
          </div>
        </div>
      </header>
    </>
  );
}
