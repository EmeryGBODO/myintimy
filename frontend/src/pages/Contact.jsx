import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHead } from "../components/Shared.jsx";
import { useShop } from "../context/shop-context.js";
import { validateEmailField, validateRequiredField } from "../utils/validation.js";

export default function Contact() {
  const { openPanel } = useShop();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "conseil", message: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key) {
    return (e) => {
      setForm((current) => ({ ...current, [key]: e.target.value }));
      if (fieldErrors[key]) {
        setFieldErrors((current) => ({ ...current, [key]: null }));
      }
    };
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;

    const errors = {};
    const nameErr = validateRequiredField(form.name, "Le nom");
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmailField(form.email);
    if (emailErr) errors.email = emailErr;

    const msgErr = validateRequiredField(form.message, "Le message");
    if (msgErr) errors.message = msgErr;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    // Simulation d'envoi du message de contact
    setTimeout(() => {
      setBusy(false);
      setSent(true);
      setForm({ name: "", email: "", phone: "", subject: "conseil", message: "" });
    }, 400);
  }

  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Contact & Conseil Privé" }]}
        title={<>Conseil & <span className="ital">Contact</span></>}
      >
        Une question sur une coupe, une taille ou le suivi d'une commande ? Notre équipe vous répond avec attention et discrétion.
      </PageHead>

      <section className="wrap max-w-[1040px] pb-24 pt-4">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Formulaire de contact */}
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-light text-fg sm:text-3xl">Écrivez-nous en confidence</h2>
              <p className="mt-1 text-sm text-muted">Nous nous engageons à vous apporter une réponse personnalisée sous 24 heures ouvrées.</p>
            </div>

            {sent && (
              <div
                className="mb-6 border border-success/30 bg-success-soft p-4 text-sm text-success"
                role="status"
                aria-live="polite"
              >
                ✓ Votre message a été transmis avec succès. Une conseillère Myintimy prendra contact avec vous dans les plus brefs délais.
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="grid gap-4 border border-line bg-surface p-6 sm:p-8">
              <label className="grid gap-1.5">
                <span className="field-label">
                  Votre nom <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  disabled={busy}
                  placeholder="Prénom ou nom"
                  className={`field ${fieldErrors.name ? "border-danger focus:border-danger" : ""}`}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && <p className="text-xs text-danger" role="alert">{fieldErrors.name}</p>}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="field-label">
                    Adresse e-mail <span className="text-accent" aria-hidden="true">*</span>
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    disabled={busy}
                    placeholder="contact@exemple.com"
                    className={`field ${fieldErrors.email ? "border-danger focus:border-danger" : ""}`}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                  {fieldErrors.email && <p className="text-xs text-danger" role="alert">{fieldErrors.email}</p>}
                </label>

                <label className="grid gap-1.5">
                  <span className="field-label">Téléphone (facultatif)</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    disabled={busy}
                    placeholder="+229 00 00 00 00"
                    className="field"
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="field-label">Motif de la demande</span>
                <select
                  value={form.subject}
                  onChange={set("subject")}
                  disabled={busy}
                  className="select mt-1 border-b border-line-strong bg-transparent py-2.5 text-sm"
                  aria-label="Motif de la demande"
                >
                  <option value="conseil">Conseil personnalisé & choix des tailles</option>
                  <option value="commande">Suivi de commande ou livraison</option>
                  <option value="retour">Échange, retour ou réclamation</option>
                  <option value="autre">Autre demande</option>
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="field-label">
                  Votre message <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <textarea
                  rows="4"
                  value={form.message}
                  onChange={set("message")}
                  disabled={busy}
                  placeholder="Décrivez votre demande en toute liberté..."
                  className={`field resize-none ${fieldErrors.message ? "border-danger focus:border-danger" : ""}`}
                  aria-invalid={Boolean(fieldErrors.message)}
                />
                {fieldErrors.message && <p className="text-xs text-danger" role="alert">{fieldErrors.message}</p>}
              </label>

              <button type="submit" disabled={busy} className="btn mt-2 w-full">
                {busy ? "Envoi en cours…" : "Envoyer mon message"}
              </button>
            </form>
          </div>

          {/* Coordonnées et accès rapides */}
          <div className="space-y-8">
            <div className="border border-line bg-bg p-6 sm:p-8">
              <p className="eyebrow mb-2">Canal privilégié</p>
              <h3 className="font-display text-2xl font-light text-fg">Conseil privé sur WhatsApp</h3>
              <p className="mt-2 text-sm text-muted">
                Pour une réponse immédiate et en toute discrétion, échangez directement avec une conseillère dédiée.
              </p>
              <div className="mt-4 flex items-center gap-3 font-display text-lg text-accent">
                <span className="font-sans text-xs uppercase tracking-widest text-muted">Numéro :</span>
                <span className="select-all font-sans text-sm font-medium text-fg">+229 01 00 00 00 00</span>
              </div>
              <p className="mt-2 text-xs text-muted">Disponible du Lundi au Samedi, de 9h à 19h (heure de Cotonou).</p>
            </div>

            <div className="border border-line bg-bg p-6 sm:p-8">
              <p className="eyebrow mb-2">Adresse électronique</p>
              <h3 className="font-display text-2xl font-light text-fg">Courrier électronique</h3>
              <p className="mt-2 text-sm text-muted">
                Pour toute demande commerciale, presse ou partenariats :
              </p>
              <p className="mt-3 font-sans text-sm font-medium text-fg">contact@myintimy.com</p>
            </div>

            <div className="border border-line bg-surface p-6">
              <h4 className="font-sans text-xs uppercase tracking-[.18em] text-muted">Accès rapides</h4>
              <ul className="mt-3 grid gap-2 text-sm">
                <li>
                  <button type="button" onClick={() => openPanel("sizes")} className="text-fg underline hover:text-accent">
                    Consulter le Guide des tailles
                  </button>
                </li>
                <li>
                  <Link to="/livraison" className="text-fg underline hover:text-accent">
                    Informations sur la livraison discrète
                  </Link>
                </li>
                <li>
                  <Link to="/retours" className="text-fg underline hover:text-accent">
                    Modalités d'échanges et de retours (14 jours)
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

