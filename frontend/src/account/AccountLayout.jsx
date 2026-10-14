import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useClient } from "./client-context.js";
import { PageHead } from "../components/Shared.jsx";

const tabs = [
  ["/compte", "Profil", true],
  ["/compte/adresses", "Adresses"],
  ["/compte/commandes", "Commandes"],
  ["/favoris", "Favoris"],
];

export default function AccountLayout() {
  const { customer, loading, logout } = useClient();
  if (loading) return <div className="wrap py-24 text-center text-muted">Chargement de votre espace…</div>;
  if (!customer) return <Navigate to="/compte/connexion" replace />;

  return (
    <>
      <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Mon compte" }]} title={<>Bonjour, <span className="ital">{customer.full_name.split(" ")[0]}</span></>}>Gérez vos informations, vos adresses et vos commandes.</PageHead>
      <section className="wrap grid gap-8 pb-24 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav className="flex gap-2 overflow-x-auto border-b border-line pb-3 lg:grid lg:gap-1 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5" aria-label="Mon compte">
            {tabs.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={Boolean(end)} className={({ isActive }) => `whitespace-nowrap px-3 py-2 font-sans text-xs uppercase tracking-[.16em] transition-colors ${isActive ? "bg-surface text-fg" : "text-muted hover:text-fg"}`}>{label}</NavLink>
            ))}
            <button onClick={logout} className="whitespace-nowrap px-3 py-2 text-left font-sans text-xs uppercase tracking-[.16em] text-muted transition-colors hover:text-danger">Déconnexion</button>
          </nav>
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </section>
    </>
  );
}
