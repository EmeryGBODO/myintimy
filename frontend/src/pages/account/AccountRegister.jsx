import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useClient } from "../../account/client-context.js";
import { PageHead } from "../../components/Shared.jsx";
import { extractFieldErrors, formatApiErrorMessage } from "../../api/errors.js";
import {
  validateEmailField,
  validatePasswordField,
  validatePhoneField,
  validateRequiredField,
} from "../../utils/validation.js";

export default function AccountRegister() {
  const { customer, register } = useClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (customer) return <Navigate to="/compte" replace />;

  const set = (key) => (e) => {
    setForm((current) => ({ ...current, [key]: e.target.value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: null }));
    }
  };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");

    const errors = {};
    const nameErr = validateRequiredField(form.full_name, "Le prénom et nom");
    if (nameErr) errors.full_name = nameErr;
    else if (form.full_name.trim().length < 2) errors.full_name = "Le prénom et nom doit comporter au moins 2 caractères.";

    const emailErr = validateEmailField(form.email);
    if (emailErr) errors.email = emailErr;

    if (form.phone.trim()) {
      const phoneErr = validatePhoneField(form.phone);
      if (phoneErr) errors.phone = phoneErr;
    }

    const passErr = validatePasswordField(form.password);
    if (passErr) errors.password = passErr;

    if (form.password && form.confirm && form.password !== form.confirm) {
      errors.confirm = "Les mots de passe ne correspondent pas.";
    } else if (!form.confirm) {
      errors.confirm = "Veuillez confirmer votre mot de passe.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
      const backendFieldErrors = extractFieldErrors(err);
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
      }
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
        <form onSubmit={submit} noValidate className="mx-auto grid max-w-[620px] gap-5 border border-line bg-surface p-6 sm:p-9">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">
                Prénom et nom <span className="text-accent" aria-hidden="true">*</span>
              </span>
              <input
                className={`field ${fieldErrors.full_name ? "border-danger focus:border-danger" : ""}`}
                autoComplete="name"
                value={form.full_name}
                onChange={set("full_name")}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.full_name)}
              />
              {fieldErrors.full_name && (
                <p className="text-xs text-danger" role="alert">{fieldErrors.full_name}</p>
              )}
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">
                Téléphone <span className="normal-case tracking-normal text-muted">(facultatif)</span>
              </span>
              <input
                className={`field ${fieldErrors.phone ? "border-danger focus:border-danger" : ""}`}
                type="tel"
                placeholder="+229 97 00 00 00"
                autoComplete="tel"
                value={form.phone}
                onChange={set("phone")}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-danger" role="alert">{fieldErrors.phone}</p>
              )}
            </label>
          </div>

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

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">
                Mot de passe <span className="text-accent" aria-hidden="true">*</span>
              </span>
              <input
                className={`field ${fieldErrors.password ? "border-danger focus:border-danger" : ""}`}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && (
                <p className="text-xs text-danger" role="alert">{fieldErrors.password}</p>
              )}
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">
                Confirmation <span className="text-accent" aria-hidden="true">*</span>
              </span>
              <input
                className={`field ${fieldErrors.confirm ? "border-danger focus:border-danger" : ""}`}
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set("confirm")}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.confirm)}
              />
              {fieldErrors.confirm && (
                <p className="text-xs text-danger" role="alert">{fieldErrors.confirm}</p>
              )}
            </label>
          </div>

          <p className="text-xs text-muted">10 caractères minimum.</p>

          {error && <p className="min-h-[1.2em] text-sm text-danger" role="alert">{error}</p>}

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
