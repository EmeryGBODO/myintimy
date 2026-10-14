import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useClient } from "../../account/client-context.js";
import { PageHead } from "../../components/Shared.jsx";

export default function AccountLogin() {
  const { customer, login } = useClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (customer) return <Navigate to="/compte" replace />;
  const next = location.state?.from || "/compte";

  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await login(form); navigate(next, { replace: true }); }
    catch (err) { setError(err?.message || "Connexion impossible."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Connexion" }]} title={<>Votre espace <span className="ital">privé</span></>}>Retrouvez vos adresses, favoris et commandes.</PageHead>
    <section className="wrap pb-24"><form onSubmit={submit} className="mx-auto grid max-w-[520px] gap-5 border border-line bg-surface p-6 sm:p-9">
      <label className="grid gap-1.5"><span className="field-label">E-mail</span><input className="field" type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required /></label>
      <label className="grid gap-1.5"><span className="field-label">Mot de passe</span><input className="field" type="password" autoComplete="current-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} required /></label>
      <p className="min-h-[1.2em] text-sm text-danger" role="alert">{error}</p>
      <button className="btn w-full" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      <div className="flex flex-col gap-2 text-center text-sm text-muted sm:flex-row sm:justify-between"><Link to="/compte/inscription" className="hover:text-fg">Créer un compte</Link><Link to="/compte/mot-de-passe-oublie" className="hover:text-fg">Mot de passe oublié ?</Link></div>
    </form></section>
  </>;
}
