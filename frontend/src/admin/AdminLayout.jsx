import { NavLink, Outlet } from "react-router-dom";
import { IconMoon, IconSun } from "../components/Icons.jsx";
import { useShop } from "../context/shop-context.js";
import { useAdmin } from "./admin-context.js";

const NAV = [
  ["/admin", "Tableau de bord", true],
  ["/admin/products", "Produits"],
  ["/admin/categories", "Catégories"],
  ["/admin/inventory", "Stocks"],
];

function ThemeToggle() {
  const { isDark, toggleTheme } = useShop();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-10 w-10 shrink-0 place-items-center border border-plum-fg/20 text-plum-fg transition-colors hover:border-rose hover:text-rose"
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
    >
      {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
    </button>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAdmin();

  return (
    <div className="min-h-[100dvh] bg-bg text-fg transition-colors duration-500">
      <div className="min-h-[100dvh] lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="z-30 bg-plum text-plum-fg transition-colors duration-500 lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col lg:border-r lg:border-plum-fg/10">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:block lg:px-7 lg:pb-7 lg:pt-8">
            <div className="min-w-0">
              <div className="font-display text-[22px] font-light uppercase leading-none tracking-[.24em] sm:text-2xl lg:text-[28px] lg:tracking-[.3em]">
                Myintimy
              </div>
              <div className="mt-1.5 font-sans text-[8.5px] font-normal uppercase tracking-[.3em] text-plum-muted lg:mt-2">
                Administration
              </div>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="min-h-10 border border-plum-fg/20 px-3 font-sans text-[9.5px] uppercase tracking-[.12em] text-plum-fg transition-colors hover:border-rose hover:text-rose"
              >
                Quitter
              </button>
            </div>
          </div>

          <nav
            className="no-scrollbar flex overflow-x-auto border-t border-plum-fg/10 px-2 py-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-t-0 lg:px-4 lg:py-0"
            aria-label="Navigation de l’administration"
          >
            {NAV.map(([to, label, end]) => (
              <NavLink
                key={to}
                end={Boolean(end)}
                to={to}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap border-b-2 px-3 py-3 font-sans text-[10px] font-normal uppercase tracking-[.14em] transition-colors lg:border-b-0 lg:border-l-2 lg:px-4 lg:py-3.5 ${
                    isActive
                      ? "border-rose bg-plum-fg/[.06] text-rose"
                      : "border-transparent text-plum-muted hover:bg-plum-fg/[.04] hover:text-plum-fg"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto hidden border-t border-plum-fg/10 px-7 py-6 lg:block">
            <div className="mb-5 flex items-center justify-between">
              <span className="font-sans text-[9px] uppercase tracking-[.18em] text-plum-muted">Apparence</span>
              <ThemeToggle />
            </div>
            <div className="truncate text-sm text-plum-fg">{user?.full_name}</div>
            <div className="mt-1 truncate text-xs text-plum-muted">{user?.email}</div>
            <button
              type="button"
              onClick={logout}
              className="mt-5 font-sans text-[9.5px] uppercase tracking-[.14em] text-plum-muted underline decoration-plum-muted/50 underline-offset-4 transition-colors hover:text-rose"
            >
              Se déconnecter
            </button>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
          <div className="mx-auto w-full max-w-[1480px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
