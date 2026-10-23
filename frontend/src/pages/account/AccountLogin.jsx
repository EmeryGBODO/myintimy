import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useClient } from "../../account/client-context.js";
import { PageHead } from "../../components/Shared.jsx";
import { extractFieldErrors, formatApiErrorMessage } from "../../api/errors.js";
import { validateEmailField, validateRequiredField } from "../../utils/validation.js";

export default function AccountLogin() {
  const { customer, login } = useClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (customer) return <Navigate to="/compte" replace />;
  const next = location.state?.from || "/compte";

  function set(key) {
    return (e) => {
      setForm((current) => ({ ...current, [key]: e.target.value }));
      if (fieldErrors[key]) {
        setFieldErrors((current) => ({ ...current, [key]: null }));
      }
    };
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");

    const errors = {};
    const emailErr = validateEmailField(form.email);
    if (emailErr) errors.email = emailErr;

    const passErr = validateRequiredField(form.password, "Le mot de passe");
    if (passErr) errors.password = passErr;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);

    try {
      await login(form);
      navigate(next, { replace: true });
    } catch (err) {
      const backendFieldErrors = extractFieldErrors(err);
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
      }
      if (err?.status === 401 || err?.code === "INVALID_CUSTOMER_CREDENTIALS") {
        setError("E-mail ou mot de passe incorrect.");
      } else {
        setError(formatApiErrorMessage(err, "Identifiants invalides ou connexion impossible."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Connexion" }]}
        title={<>Votre espace <span className="ital">privé</span></>}
      >
        Retrouvez vos adresses, favoris et commandes.
      </PageHead>
      <section className="wrap pb-24">
        <form onSubmit={submit} noValidate className="mx-auto grid max-w-[520px] gap-5 border border-line bg-surface p-6 sm:p-9">
          <label className="grid gap-1.5">
            <span className="field-label">
              E-mail <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <input
              className={`field ${fieldErrors.email ? "border-danger focus:border-danger" : ""}`}
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="text-xs text-danger" role="alert">{fieldErrors.email}</p>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className="field-label">
              Mot de passe <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <input
              className={`field ${fieldErrors.password ? "border-danger focus:border-danger" : ""}`}
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={set("password")}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password && (
              <p className="text-xs text-danger" role="alert">{fieldErrors.password}</p>
            )}
          </label>

          <p className="min-h-[1.2em] text-sm text-danger" role="alert">{error}</p>

          <button className="btn w-full" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
          <div className="flex flex-col gap-2 text-center text-sm text-muted sm:flex-row sm:justify-between">
            <Link to="/compte/inscription" className="hover:text-fg">Créer un compte</Link>
            <Link to="/compte/mot-de-passe-oublie" className="hover:text-fg">Mot de passe oublié ?</Link>
          </div>
        </form>
      </section>
    </>
  );
}