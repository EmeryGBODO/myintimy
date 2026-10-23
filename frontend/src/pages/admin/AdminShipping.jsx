import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin.js";
import { formatXof } from "../../admin/format.js";
import { extractFieldErrors } from "../../api/errors.js";
import { validatePositiveInt } from "../../utils/validation.js";
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminStatus,
  AdminTitle,
  buttonClass,
  compactButtonClass,
  ghostButtonClass,
  inputClass,
} from "../../admin/AdminUI.jsx";

const DEFAULT_FORM = {
  name: "",
  fee_xof: 3000,
  has_free_shipping: true,
  free_shipping_threshold_xof: 50000,
  is_active: true,
  display_order: 10,
};

function Field({ label, hint, required = false, error, children }) {
  return (
    <label className="block">
      <span className="field-label mb-1.5 block text-xs font-normal uppercase tracking-[.14em] text-muted">
        {label}
        {required && <span className="ml-1 text-accent" aria-hidden="true">*</span>}
      </span>
      {children}
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
      {hint && !error && <span className="mt-1 block text-[11.5px] leading-relaxed text-muted/80">{hint}</span>}
    </label>
  );
}

export default function AdminShipping() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await adminApi.shippingZones();
      setZones(items);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredZones = useMemo(() => {
    if (statusFilter === "active") return zones.filter((z) => z.is_active);
    if (statusFilter === "inactive") return zones.filter((z) => !z.is_active);
    return zones;
  }, [zones, statusFilter]);

  const stats = useMemo(() => {
    const total = zones.length;
    const active = zones.filter((z) => z.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [zones]);

  function startEdit(zone) {
    setEditingId(zone.id);
    setForm({
      name: zone.name,
      fee_xof: zone.fee_xof,
      has_free_shipping: zone.free_shipping_threshold_xof !== null,
      free_shipping_threshold_xof: zone.free_shipping_threshold_xof || 50000,
      is_active: zone.is_active,
      display_order: zone.display_order,
    });
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  }

  async function toggleStatus(zone) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.updateShippingZone(zone.id, { is_active: !zone.is_active });
      setZones((current) =>
        current.map((z) => (z.id === zone.id ? { ...z, is_active: !z.is_active } : z)),
      );
      setSuccess(`Statut de « ${zone.name} » mis à jour avec succès.`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setSuccess(null);

    const errors = {};
    const name = form.name.trim();
    if (!name) {
      errors.name = "Le nom de la zone est obligatoire.";
    } else if (name.length < 2) {
      errors.name = "Le nom de la zone doit comporter au moins 2 caractères.";
    }

    const feeErr = validatePositiveInt(form.fee_xof, "Le tarif d'expédition");
    if (feeErr) errors.fee_xof = feeErr;

    let threshold = null;
    if (form.has_free_shipping) {
      const threshErr = validatePositiveInt(form.free_shipping_threshold_xof, "Le seuil de gratuité");
      if (threshErr) errors.free_shipping_threshold_xof = threshErr;
      else threshold = Number(form.free_shipping_threshold_xof);
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const fee = Number(form.fee_xof);
      const payload = {
        name,
        fee_xof: Math.round(fee),
        free_shipping_threshold_xof: threshold !== null ? Math.round(threshold) : null,
        is_active: form.is_active,
        display_order: Number(form.display_order) || 0,
      };

      if (editingId) {
        const updated = await adminApi.updateShippingZone(editingId, payload);
        setZones((current) => current.map((z) => (z.id === editingId ? updated : z)));
        setSuccess(`Zone « ${updated.name} » mise à jour avec succès.`);
      } else {
        const created = await adminApi.createShippingZone(payload);
        setZones((current) => [...current, created].sort((a, b) => a.display_order - b.display_order));
        setSuccess(`Zone « ${created.name} » ajoutée avec succès.`);
      }

      resetForm();
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

  return (
    <div>
      <AdminTitle
        title="Livraison & Tarification"
        subtitle="Gestion des zones de livraison desservies, des frais d'expédition en FCFA et des seuils de gratuité."
        action={
          editingId ? (
            <button type="button" onClick={resetForm} className={ghostButtonClass}>
              + Ajouter une nouvelle zone
            </button>
          ) : null
        }
      />

      <AdminError error={error} onRetry={load} />

      {success && (
        <div
          className="mb-5 border border-success/20 bg-success-soft px-4 py-3 text-sm text-success transition-all"
          role="status"
        >
          {success}
        </div>
      )}

      {/* Barre d'indicateurs synthétiques */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <AdminCard className="p-4 sm:p-4">
          <span className="text-[11px] uppercase tracking-[.14em] text-muted">Total des zones</span>
          <p className="mt-1 font-display text-2xl font-light text-fg">{stats.total}</p>
        </AdminCard>
        <AdminCard className="p-4 sm:p-4">
          <span className="text-[11px] uppercase tracking-[.14em] text-muted">Zones actives</span>
          <p className="mt-1 font-display text-2xl font-light text-success">{stats.active}</p>
        </AdminCard>
        <AdminCard className="p-4 sm:p-4">
          <span className="text-[11px] uppercase tracking-[.14em] text-muted">Désactivées</span>
          <p className="mt-1 font-display text-2xl font-light text-muted">{stats.inactive}</p>
        </AdminCard>
        <AdminCard className="p-4 sm:p-4">
          <span className="text-[11px] uppercase tracking-[.14em] text-muted">Devise de facturation</span>
          <p className="mt-1 font-display text-xl font-light text-accent">FCFA (XOF)</p>
        </AdminCard>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_430px]">
        {/* Colonne gauche : Liste des zones */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-xl font-light text-fg">Zones de livraison configurées</h2>
            <div className="flex gap-1 border border-line p-0.5 text-xs">
              {[
                ["all", "Toutes"],
                ["active", "Actives"],
                ["inactive", "Désactivées"],
              ].map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 font-sans text-[11px] uppercase tracking-[.1em] transition-colors ${
                    statusFilter === filter ? "bg-fg text-bg" : "text-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <AdminLoading />
          ) : filteredZones.length === 0 ? (
            <AdminEmpty>Aucune zone de livraison ne correspond à ce filtre.</AdminEmpty>
          ) : (
            <>
              {/* Vue table sur Desktop */}
              <div className="hidden overflow-x-auto md:block border border-line bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface/70 font-sans text-[10.5px] uppercase tracking-[.14em] text-muted">
                    <tr>
                      <th className="px-4 py-3 font-normal">Zone / Ville</th>
                      <th className="px-4 py-3 font-normal">Tarif standard</th>
                      <th className="px-4 py-3 font-normal">Livraison offerte</th>
                      <th className="px-4 py-3 font-normal">Statut</th>
                      <th className="px-4 py-3 text-right font-normal">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredZones.map((zone) => {
                      const isSelected = editingId === zone.id;
                      return (
                        <tr
                          key={zone.id}
                          className={`transition-colors hover:bg-fg/[.02] ${
                            isSelected ? "bg-accent/[.06]" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-fg">{zone.name}</div>
                            <div className="text-[11.5px] text-muted">
                              code: <span className="font-mono">{zone.code}</span>
                              {zone.display_order ? ` · ordre ${zone.display_order}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-medium tabular-nums text-fg">
                            {formatXof(zone.fee_xof)}
                          </td>
                          <td className="px-4 py-3.5 tabular-nums">
                            {zone.free_shipping_threshold_xof !== null ? (
                              <span className="text-fg">
                                Dès {formatXof(zone.free_shipping_threshold_xof)}
                              </span>
                            ) : (
                              <span className="text-muted/70 italic text-xs">Jamais offerte</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <AdminStatus tone={zone.is_active ? "success" : "neutral"}>
                              {zone.is_active ? "Actif" : "Désactivé"}
                            </AdminStatus>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(zone)}
                                className={compactButtonClass}
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleStatus(zone)}
                                className={`inline-flex min-h-8 items-center px-2.5 py-1.5 text-xs transition-colors ${
                                  zone.is_active
                                    ? "text-muted hover:text-danger"
                                    : "text-success hover:underline"
                                }`}
                              >
                                {zone.is_active ? "Désactiver" : "Activer"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vue cartes sur Mobile / Tablette */}
              <div className="grid gap-3 md:hidden">
                {filteredZones.map((zone) => {
                  const isSelected = editingId === zone.id;
                  return (
                    <article
                      key={zone.id}
                      className={`border p-4 transition-colors ${
                        isSelected ? "border-accent bg-accent/[.04]" : "border-line bg-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-fg">{zone.name}</h3>
                          <p className="text-xs text-muted">code : {zone.code}</p>
                        </div>
                        <AdminStatus tone={zone.is_active ? "success" : "neutral"}>
                          {zone.is_active ? "Actif" : "Désactivé"}
                        </AdminStatus>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-xs">
                        <div>
                          <span className="text-muted">Tarif :</span>{" "}
                          <strong className="text-fg">{formatXof(zone.fee_xof)}</strong>
                        </div>
                        <div>
                          <span className="text-muted">Gratuité :</span>{" "}
                          <span className="text-fg">
                            {zone.free_shipping_threshold_xof !== null
                              ? `Dès ${formatXof(zone.free_shipping_threshold_xof)}`
                              : "Non applicable"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-line/60 pt-3">
                        <button
                          type="button"
                          onClick={() => startEdit(zone)}
                          className={`flex-1 ${compactButtonClass}`}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleStatus(zone)}
                          className={`flex-1 border border-line px-3 py-1.5 text-center text-xs transition-colors ${
                            zone.is_active
                              ? "text-muted hover:border-danger hover:text-danger"
                              : "text-success hover:border-success"
                          }`}
                        >
                          {zone.is_active ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Colonne droite : Formulaire de création / modification */}
        <aside className="sticky top-6">
          <AdminCard>
            <div className="mb-5 border-b border-line pb-4">
              <p className="eyebrow mb-1">
                {editingId ? "Édition de zone" : "Nouvelle zone"}
              </p>
              <h3 className="font-display text-2xl font-light text-fg">
                {editingId ? `Modifier « ${form.name || "..."} »` : "Ajouter une zone"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} noValidate className="grid gap-4">
              <Field
                label="Nom de la zone ou ville"
                required
                error={fieldErrors.name}
                hint="Ex : Cotonou, Parakou, Abomey-Calavi, Ouidah..."
              >
                <input
                  type="text"
                  placeholder="Nom de la ville ou zone"
                  value={form.name}
                  onChange={(e) => {
                    setForm((c) => ({ ...c, name: e.target.value }));
                    if (fieldErrors.name) setFieldErrors((c) => ({ ...c, name: null }));
                  }}
                  className={`${inputClass} ${fieldErrors.name ? "border-danger focus:border-danger" : ""}`}
                />
              </Field>

              <Field
                label="Tarif d'expédition (FCFA)"
                required
                error={fieldErrors.fee_xof}
                hint="Montant standard facturé au client."
              >
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="1500"
                  value={form.fee_xof}
                  onChange={(e) => {
                    setForm((c) => ({ ...c, fee_xof: e.target.value }));
                    if (fieldErrors.fee_xof) setFieldErrors((c) => ({ ...c, fee_xof: null }));
                  }}
                  className={`${inputClass} ${fieldErrors.fee_xof ? "border-danger focus:border-danger" : ""}`}
                />
              </Field>

              {/* Option de livraison gratuite */}
              <div className="border border-line/80 bg-surface/70 p-3.5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.has_free_shipping}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, has_free_shipping: e.target.checked }))
                    }
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-[.08em] text-fg">
                      Livraison offerte avec seuil d'achat
                    </span>
                    <p className="text-[11.5px] leading-relaxed text-muted">
                      Active la gratuité des frais de port lorsque le panier du client atteint un montant minimum.
                    </p>
                  </div>
                </label>

                {form.has_free_shipping && (
                  <div className="mt-3.5 border-t border-line/60 pt-3">
                    <Field
                      label="Seuil d'achat minimum (FCFA)"
                      required
                      error={fieldErrors.free_shipping_threshold_xof}
                      hint="Gratuit dès que le panier atteint ce total (ex : 50 000 FCFA)."
                    >
                      <input
                        type="number"
                        min="0"
                        step="500"
                        placeholder="50000"
                        value={form.free_shipping_threshold_xof}
                        onChange={(e) => {
                          setForm((c) => ({ ...c, free_shipping_threshold_xof: e.target.value }));
                          if (fieldErrors.free_shipping_threshold_xof) {
                            setFieldErrors((c) => ({ ...c, free_shipping_threshold_xof: null }));
                          }
                        }}
                        className={`${inputClass} ${
                          fieldErrors.free_shipping_threshold_xof ? "border-danger focus:border-danger" : ""
                        }`}
                      />
                    </Field>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Ordre d'affichage" hint="Priorité dans la liste.">
                  <input
                    type="number"
                    min="0"
                    placeholder="1"
                    value={form.display_order}
                    onChange={(e) => setForm((c) => ({ ...c, display_order: e.target.value }))}
                    className={inputClass}
                  />
                </Field>

                <div className="flex flex-col justify-end">
                  <label className="flex cursor-pointer items-center gap-2.5 py-2.5 text-xs text-fg">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))}
                      className="accent-accent"
                    />
                    <span className="font-medium">Zone active</span>
                  </label>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2 pt-2 sm:flex-row">
                <button type="submit" disabled={busy} className={`flex-1 ${buttonClass}`}>
                  {editingId ? "Mettre à jour" : "Créer la zone"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resetForm}
                    className={`sm:w-auto ${ghostButtonClass}`}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}

