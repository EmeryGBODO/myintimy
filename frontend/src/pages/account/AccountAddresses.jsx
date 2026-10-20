import { useCallback, useEffect, useState } from "react";
import { customerApi } from "../../api/customer.js";
import { CITIES } from "../../data/catalog.js";
import { InlineError, InlineLoading } from "../../components/Shared.jsx";
import { extractFieldErrors } from "../../api/errors.js";
import { validatePhoneField, validateRequiredField } from "../../utils/validation.js";

const empty = {
  label: "Maison",
  recipient_name: "",
  phone: "",
  city: "Cotonou",
  area: "",
  address: "",
  is_default: false,
};

export default function AccountAddresses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const addresses = await customerApi.addresses.list();
      setItems(addresses || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(item) {
    setEditing(item.id);
    setForm({
      label: item.label,
      recipient_name: item.recipient_name,
      phone: item.phone,
      city: item.city,
      area: item.area,
      address: item.address,
      is_default: item.is_default,
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditing(null);
    setForm(empty);
    setFieldErrors({});
    setError(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const errors = {};
    const nameErr = validateRequiredField(form.recipient_name, "Le nom du destinataire");
    if (nameErr) errors.recipient_name = nameErr;

    const phoneErr = validatePhoneField(form.phone);
    if (phoneErr) errors.phone = phoneErr;

    const areaErr = validateRequiredField(form.area, "Le quartier");
    if (areaErr) errors.area = areaErr;

    const addrErr = validateRequiredField(form.address, "L'adresse");
    if (addrErr) errors.address = addrErr;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);

    try {
      if (editing) {
        await customerApi.addresses.update(editing, form);
      } else {
        await customerApi.addresses.create(form);
      }
      reset();
      await load();
    } catch (err) {
      const backendFieldErrors = extractFieldErrors(err);
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
      }
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (deletingId) return;
    if (!window.confirm("Supprimer cette adresse ?")) return;

    setDeletingId(id);
    setError(null);
    try {
      await customerApi.addresses.remove(id);
      if (editing === id) reset();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setDeletingId(null);
    }
  }

  const set = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: val });
    if (fieldErrors[k]) {
      setFieldErrors((current) => ({ ...current, [k]: null }));
    }
  };

  return (
    <div className="grid gap-8">
      <div>
        <p className="eyebrow">Livraison</p>
        <h2 className="mt-2 text-4xl">Vos adresses</h2>
      </div>

      <InlineError error={error} onRetry={load} />

      <form onSubmit={submit} noValidate className="grid gap-4 border border-line bg-surface p-5 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="field-label">
              Nom de l'adresse <span className="normal-case tracking-normal text-muted">(facultatif)</span>
            </span>
            <input
              className={`field ${fieldErrors.label ? "border-danger focus:border-danger" : ""}`}
              value={form.label}
              onChange={set("label")}
              disabled={busy}
              placeholder="Ex: Maison, Bureau…"
              aria-invalid={Boolean(fieldErrors.label)}
            />
            {fieldErrors.label && (
              <p className="text-xs text-danger" role="alert">{fieldErrors.label}</p>
            )}
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">
              Destinataire <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <input
              className={`field ${fieldErrors.recipient_name ? "border-danger focus:border-danger" : ""}`}
              value={form.recipient_name}
              onChange={set("recipient_name")}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.recipient_name)}
            />
            {fieldErrors.recipient_name && (
              <p className="text-xs text-danger" role="alert">{fieldErrors.recipient_name}</p>
            )}
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">
              Téléphone <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <input
              className={`field ${fieldErrors.phone ? "border-danger focus:border-danger" : ""}`}
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+229 97 00 00 00"
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-danger" role="alert">{fieldErrors.phone}</p>
            )}
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">
              Ville <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <select
              className="field"
              value={form.city}
              onChange={set("city")}
              disabled={busy}
            >
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">
              Quartier <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <input
              className={`field ${fieldErrors.area ? "border-danger focus:border-danger" : ""}`}
              value={form.area}
              onChange={set("area")}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.area)}
            />
            {fieldErrors.area && (
              <p className="text-xs text-danger" role="alert">{fieldErrors.area}</p>
            )}
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">
              Adresse / repère <span className="text-accent" aria-hidden="true">*</span>
            </span>
            <input
              className={`field ${fieldErrors.address ? "border-danger focus:border-danger" : ""}`}
              value={form.address}
              onChange={set("address")}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.address)}
            />
            {fieldErrors.address && (
              <p className="text-xs text-danger" role="alert">{fieldErrors.address}</p>
            )}
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={set("is_default")}
            disabled={busy}
            className="accent-accent"
          />
          Définir comme adresse par défaut
        </label>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button className="btn" disabled={busy}>
            {busy ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter l'adresse"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={reset}
              disabled={busy}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <InlineLoading message="Chargement de vos adresses…" />
      ) : items.length === 0 ? (
        <div className="border border-line p-8 text-center text-muted">
          <p className="text-base text-fg">Aucune adresse enregistrée</p>
          <p className="mt-1 text-sm">
            Ajoutez votre première adresse ci-dessus pour préremplir automatiquement la livraison de vos prochaines commandes.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="border border-line p-5 transition-colors hover:bg-surface/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    {item.label}
                    {item.is_default ? " · Par défaut" : ""}
                  </p>
                  <h3 className="mt-2 text-2xl font-light text-fg">{item.recipient_name}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {item.phone}
                <br />
                {item.area}, {item.city}
                <br />
                {item.address}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost px-4 py-2 text-xs"
                  disabled={busy || deletingId === item.id}
                  onClick={() => edit(item)}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-xs text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
                  disabled={busy || deletingId === item.id}
                  onClick={() => remove(item.id)}
                >
                  {deletingId === item.id ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
