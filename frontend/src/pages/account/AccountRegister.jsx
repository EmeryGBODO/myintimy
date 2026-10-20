import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useClient } from "../../account/client-context.js";
import { PageHead } from "../../components/Shared.jsx";
import { formatApiErrorMessage } from "../../api/errors.js";

export default function AccountRegister() {
  const { customer, register } = useClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (customer) return <Navigate to="/compte" replace />;
  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (form.password.length < 10) return setError("Le mot de passe doit contenir au moins 10 caractères.");
    if (form.password !== form.confirm) return setError("Les mots de passe ne correspondent pas.");

    setBusy(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      });
      navigate("/compte", { replace: true });
    } catch (err) {
      setError(formatApiErrorMessage(err, "Création du compte impossible."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Créer un compte" }]}
        title={<>Créer votre <span className="ital">espace</span></>}
      >
        Vos commandes, adresses et favoris vous suivront d’une visite à l’autre.
      </PageHead>
      <section className="wrap pb-24">
        <form onSubmit={submit} className="mx-auto grid max-w-[620px] gap-5 border border-line bg-surface p-6 sm:p-9">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">Prénom et nom</span>
              <input
                className="field"
                autoComplete="name"
                value={form.full_name}
                onChange={set("full_name")}
                disabled={busy}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">Téléphone</span>
              <input
                className="field"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={set("phone")}
                disabled={busy}
              />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="field-label">E-mail</span>
            <input
              className="field"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              disabled={busy}
              required
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">Mot de passe</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
                disabled={busy}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">Confirmation</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set("confirm")}
                disabled={busy}
                required
              />
            </label>
          </div>
          <p className="text-xs text-muted">10 caractères minimum.</p>
          <p className="min-h-[1.2em] text-sm text-danger" role="alert">{error}</p>
          <button className="btn w-full" disabled={busy}>
            {busy ? "Création en cours…" : "Créer mon compte"}
          </button>
          <p className="text-center text-sm text-muted">
            Déjà cliente ?{" "}
            <Link className="text-fg underline underline-offset-4" to="/compte/connexion">
              Se connecter
            </Link>
          </p>
        </form>
      </section>
    </>
  );
}
