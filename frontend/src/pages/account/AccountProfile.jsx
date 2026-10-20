import { useEffect, useState } from "react";
import { useClient } from "../../account/client-context.js";
import { customerApi } from "../../api/customer.js";
import { formatApiErrorMessage } from "../../api/errors.js";

export default function AccountProfile() {
  const { customer, refresh } = useClient();
  const [form, setForm] = useState({ full_name: "", phone: "" });
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

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError(false);

    try {
      await customerApi.updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      });
      await refresh();
      setMessage("Profil mis à jour avec succès.");
      setError(false);
    } catch (err) {
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

      <form onSubmit={submit} className="grid gap-5 border border-line bg-surface p-5 sm:p-8">
        <label className="grid gap-1.5">
          <span className="field-label">E-mail</span>
          <input className="field text-muted" value={customer.email} disabled />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="field-label">Prénom et nom</span>
            <input
              className="field"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              disabled={busy}
              required
            />
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">Téléphone</span>
            <input
              className="field"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={busy}
            />
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
