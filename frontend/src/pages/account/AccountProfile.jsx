import { useEffect, useState } from "react";
import { useClient } from "../../account/client-context.js";
import { customerApi } from "../../api/customer.js";
import { extractFieldErrors, formatApiErrorMessage } from "../../api/errors.js";
import { validatePhoneField, validateRequiredField } from "../../utils/validation.js";

export default function AccountProfile() {
  const { customer, refresh } = useClient();
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        full_name: customer.full_name || "",
        phone: customer.phone || "",
      });
    }
  }, [customer]);

  const set = (key) => (e) => {
    setForm((current) => ({ ...current, [key]: e.target.value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: null }));
    }
  };

  async function submit(e) {
    e.preventDefault();
    if (busy) return;

    setMessage("");
    setError(false);

    const errors = {};
    const nameErr = validateRequiredField(form.full_name, "Le prénom et nom");
    if (nameErr) errors.full_name = nameErr;
    else if (form.full_name.trim().length < 2) errors.full_name = "Le prénom et nom doit comporter au moins 2 caractères.";

    if (form.phone.trim()) {
      const phoneErr = validatePhoneField(form.phone);
      if (phoneErr) errors.phone = phoneErr;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);

    try {
      await customerApi.updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      });
      await refresh();
      setMessage("Profil mis à jour avec succès.");
      setError(false);
    } catch (err) {
      const backendFieldErrors = extractFieldErrors(err);
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
      }
      setMessage(formatApiErrorMessage(err, "Mise à jour impossible."));
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-[720px] gap-6">
      <div>
        <p className="eyebrow">Informations personnelles</p>
        <h2 className="mt-2 text-4xl">Votre profil</h2>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-5 border border-line bg-surface p-5 sm:p-8">
        <label className="grid gap-1.5">
          <span className="field-label">E-mail</span>
          <input className="field text-muted" value={customer?.email || ""} disabled />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="field-label">
              Prénom et nom <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <input
              className={`field ${fieldErrors.full_name ? "border-danger focus:border-danger" : ""}`}
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

        <p className={`min-h-[1.2em] text-sm ${error ? "text-danger" : "text-muted"}`} role="status">
          {message}
        </p>

        <button className="btn justify-self-start" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
