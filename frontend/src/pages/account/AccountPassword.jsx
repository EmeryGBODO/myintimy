import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { customerApi } from "../../api/customer.js";
import { PageHead } from "../../components/Shared.jsx";
import { extractFieldErrors, formatApiErrorMessage } from "../../api/errors.js";
import { validateEmailField, validatePasswordField } from "../../utils/validation.js";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");

    const err = validateEmailField(email);
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError("");

    setBusy(true);

    try {
      const result = await customerApi.requestPasswordReset(email.trim());
      setDevToken(result?.development_token || null);
      setSubmitted(true);
    } catch (apiErr) {
      const backendFieldErrors = extractFieldErrors(apiErr);
      if (backendFieldErrors.email) {
        setFieldError(backendFieldErrors.email);
      }
      setError(formatApiErrorMessage(apiErr, "Impossible de traiter la demande pour le moment."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        crumbs={[
          { to: "/", label: "Accueil" },
          { to: "/compte/connexion", label: "Connexion" },
          { label: "Mot de passe oublié" },
        ]}
        title={<>Retrouver votre <span className="ital">accès</span></>}
      >
        Recevez un lien sécurisé par e-mail pour réinitialiser votre mot de passe.
      </PageHead>
      <section className="wrap pb-24">
        <div className="mx-auto max-w-[520px] border border-line bg-surface p-6 sm:p-9">
          {submitted ? (
            <div className="grid gap-5 text-center sm:text-left">
              <div className="rounded-md border border-line bg-bg p-4 text-sm leading-relaxed text-muted">
                <p className="font-semibold text-fg">Vérifiez votre boîte de réception</p>
                <p className="mt-1">
                  Si un compte Myintimy est associé à <strong className="text-fg">{email}</strong>, un e-mail vient de vous être envoyé avec un lien de réinitialisation valable 30 minutes.
                </p>
                <p className="mt-2 text-xs text-muted">
                  Pensez également à vérifier vos dossiers de courriers indésirables ou spams.
                </p>
              </div>

              {devToken && (
                <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-xs text-left">
                  <p className="font-medium text-accent">Mode développement actif :</p>
                  <Link
                    className="mt-1 inline-block text-accent underline hover:opacity-80"
                    to={`/compte/reinitialiser?token=${encodeURIComponent(devToken)}`}
                  >
                    Tester directement le lien de réinitialisation &rarr;
                  </Link>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setDevToken(null); }}
                  className="text-sm text-accent underline hover:opacity-80"
                >
                  Renvoyer avec une autre adresse
                </button>
                <Link to="/compte/connexion" className="text-sm text-muted hover:text-fg">
                  Retour à la connexion
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-5">
              <label className="grid gap-1.5">
                <span className="field-label">
                  Adresse e-mail <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <input
                  className={`field ${fieldError ? "border-danger focus:border-danger" : ""}`}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError("");
                  }}
                  placeholder="votre.email@exemple.com"
                  disabled={busy}
                  aria-invalid={Boolean(fieldError)}
                />
                {fieldError && (
                  <p className="text-xs text-danger" role="alert">{fieldError}</p>
                )}
              </label>

              {error && <p className="text-sm text-danger" role="alert">{error}</p>}

              <button className="btn w-full" disabled={busy}>
                {busy ? "Envoi du lien en cours…" : "Recevoir le lien de réinitialisation"}
              </button>

              <div className="flex flex-col gap-2 text-center text-sm text-muted sm:flex-row sm:justify-between">
                <Link to="/compte/connexion" className="hover:text-fg">
                  Retour à la connexion
                </Link>
                <Link to="/compte/inscription" className="hover:text-fg">
                  Créer un compte
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : "") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!token) {
      setError("Le jeton de réinitialisation est manquant. Veuillez cliquer sur le lien reçu par e-mail.");
      return;
    }

    const errors = {};
    const passErr = validatePasswordField(password);
    if (passErr) errors.password = passErr;

    if (!confirm) {
      errors.confirm = "Veuillez confirmer votre mot de passe.";
    } else if (password !== confirm) {
      errors.confirm = "Les mots de passe ne correspondent pas.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      await customerApi.confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      const backendFieldErrors = extractFieldErrors(err);
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
      }
      setError(formatApiErrorMessage(err, "Impossible de réinitialiser le mot de passe. Le lien est peut-être expiré ou déjà utilisé."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        crumbs={[
          { to: "/", label: "Accueil" },
          { to: "/compte/connexion", label: "Connexion" },
          { label: "Nouveau mot de passe" },
        ]}
        title={<>Nouveau mot de <span className="ital">passe</span></>}
      >
        Définissez un mot de passe sécurisé pour votre compte Myintimy.
      </PageHead>
      <section className="wrap pb-24">
        <div className="mx-auto max-w-[520px] border border-line bg-surface p-6 sm:p-9">
          {done ? (
            <div className="grid gap-4 text-center sm:text-left">
              <div className="rounded-md border border-line bg-bg p-4 text-sm leading-relaxed text-muted">
                <p className="font-semibold text-fg">Mot de passe réinitialisé avec succès !</p>
                <p className="mt-1">
                  Votre nouveau mot de passe a bien été enregistré. Vous pouvez maintenant vous connecter à votre compte.
                </p>
              </div>
              <Link className="btn w-full text-center" to="/compte/connexion">
                Se connecter à mon compte
              </Link>
            </div>
          ) : !token ? (
            <div className="grid gap-4 text-center sm:text-left">
              <div className="rounded-md border border-line bg-bg p-4 text-sm leading-relaxed text-muted">
                <p className="font-semibold text-fg">Lien manquant ou incomplet</p>
                <p className="mt-1">
                  Aucun jeton de réinitialisation n'a été détecté dans l'adresse. Veuillez vous assurer d'avoir cliqué sur le lien complet reçu par e-mail.
                </p>
              </div>
              <Link className="btn w-full text-center" to="/compte/mot-de-passe-oublie">
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-5">
              <label className="grid gap-1.5">
                <span className="field-label">
                  Nouveau mot de passe <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <input
                  className={`field ${fieldErrors.password ? "border-danger focus:border-danger" : ""}`}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((c) => ({ ...c, password: null }));
                  }}
                  placeholder="10 caractères minimum"
                  disabled={busy}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-danger" role="alert">{fieldErrors.password}</p>
                )}
              </label>

              <label className="grid gap-1.5">
                <span className="field-label">
                  Confirmez le nouveau mot de passe <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <input
                  className={`field ${fieldErrors.confirm ? "border-danger focus:border-danger" : ""}`}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (fieldErrors.confirm) setFieldErrors((c) => ({ ...c, confirm: null }));
                  }}
                  placeholder="Répétez votre mot de passe"
                  disabled={busy}
                  aria-invalid={Boolean(fieldErrors.confirm)}
                />
                {fieldErrors.confirm && (
                  <p className="text-xs text-danger" role="alert">{fieldErrors.confirm}</p>
                )}
              </label>

              {error && (
                <div className="grid gap-2">
                  <p className="text-sm text-danger" role="alert">{error}</p>
                  {(error.includes("expiré") || error.includes("invalide") || error.includes("utilisé")) && (
                    <Link to="/compte/mot-de-passe-oublie" className="text-sm text-accent underline hover:opacity-80">
                      Demander un nouveau lien de réinitialisation &rarr;
                    </Link>
                  )}
                </div>
              )}

              <button className="btn w-full" disabled={busy || !token}>
                {busy ? "Enregistrement en cours…" : "Enregistrer le nouveau mot de passe"}
              </button>

              <div className="text-center text-sm text-muted">
                <Link to="/compte/connexion" className="hover:text-fg">
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
