import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/admin.js";
import { extractFieldErrors } from "../../api/errors.js";
import {
  validateHexColor,
  validatePositiveInt,
  validateRequiredField,
} from "../../utils/validation.js";
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminStatus,
  AdminTitle,
  buttonClass,
  ghostButtonClass,
  inputClass,
} from "../../admin/AdminUI.jsx";

const EMPTY_COLOR = { name: "", slug: "", hex_value: "#000000", display_order: 0, is_active: true };
const EMPTY_SIZE = { code: "", label: "", display_order: 0, is_active: true };

function Field({ label, required = false, error, children }) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required && <span className="ml-1 text-accent" aria-hidden="true">*</span>}
      </span>
      {children}
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </label>
  );
}

export default function AdminReferences() {
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colorForm, setColorForm] = useState(EMPTY_COLOR);
  const [sizeForm, setSizeForm] = useState(EMPTY_SIZE);
  const [colorErrors, setColorErrors] = useState({});
  const [sizeErrors, setSizeErrors] = useState({});
  const [editingColor, setEditingColor] = useState(null);
  const [editingSize, setEditingSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [colorItems, sizeItems] = await Promise.all([adminApi.colors(), adminApi.sizes()]);
      setColors(colorItems);
      setSizes(sizeItems);
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

  function resetColor() {
    setEditingColor(null);
    setColorForm(EMPTY_COLOR);
    setColorErrors({});
  }

  function resetSize() {
    setEditingSize(null);
    setSizeForm(EMPTY_SIZE);
    setSizeErrors({});
  }

  function editColor(color) {
    setEditingColor(color.id);
    setColorForm({
      name: color.name,
      slug: color.slug,
      hex_value: color.hex_value,
      display_order: color.display_order,
      is_active: color.is_active,
    });
    setColorErrors({});
  }

  function editSize(size) {
    setEditingSize(size.id);
    setSizeForm({
      code: size.code,
      label: size.label,
      display_order: size.display_order,
      is_active: size.is_active,
    });
    setSizeErrors({});
  }

  async function saveColor(event) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const errors = {};
    const nameErr = validateRequiredField(colorForm.name, "Le nom de la couleur");
    if (nameErr) errors.name = nameErr;

    const hexErr = validateHexColor(colorForm.hex_value);
    if (hexErr) errors.hex_value = hexErr;

    const orderErr = validatePositiveInt(colorForm.display_order, "L'ordre d'affichage", { required: false });
    if (orderErr) errors.display_order = orderErr;

    setColorErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const payload = { ...colorForm, display_order: Number(colorForm.display_order || 0) };
      if (!payload.slug) delete payload.slug;
      if (editingColor) await adminApi.updateColor(editingColor, payload);
      else await adminApi.createColor(payload);
      resetColor();
      await load();
    } catch (err) {
      const beErrors = extractFieldErrors(err);
      if (Object.keys(beErrors).length > 0) setColorErrors(beErrors);
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function saveSize(event) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const errors = {};
    const codeErr = validateRequiredField(sizeForm.code, "Le code de taille");
    if (codeErr) errors.code = codeErr;

    const labelErr = validateRequiredField(sizeForm.label, "Le libellé de taille");
    if (labelErr) errors.label = labelErr;

    const orderErr = validatePositiveInt(sizeForm.display_order, "L'ordre d'affichage", { required: false });
    if (orderErr) errors.display_order = orderErr;

    setSizeErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const payload = { ...sizeForm, display_order: Number(sizeForm.display_order || 0) };
      if (editingSize) await adminApi.updateSize(editingSize, payload);
      else await adminApi.createSize(payload);
      resetSize();
      await load();
    } catch (err) {
      const beErrors = extractFieldErrors(err);
      if (Object.keys(beErrors).length > 0) setSizeErrors(beErrors);
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeColor(color) {
    if (!window.confirm(`Supprimer la couleur « ${color.name} » ?`)) return;
    try {
      await adminApi.deleteColor(color.id);
      if (editingColor === color.id) resetColor();
      await load();
    } catch (err) {
      setError(err);
    }
  }

  async function removeSize(size) {
    if (!window.confirm(`Supprimer la taille « ${size.label} » ?`)) return;
    try {
      await adminApi.deleteSize(size.id);
      if (editingSize === size.id) resetSize();
      await load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <AdminTitle
        title="Référentiels"
        subtitle="Gérez les couleurs et tailles disponibles pour les variantes produit."
      />
      <AdminError error={error} onRetry={load} />

      {loading ? (
        <AdminLoading message="Chargement des référentiels…" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminCard>
            <h2 className="font-display text-2xl font-light text-fg">Couleurs</h2>
            <p className="mt-1 text-sm text-muted">Le code hexadécimal sert aussi à l’aperçu dans l’administration.</p>

            <form onSubmit={saveColor} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Nom" required error={colorErrors.name}>
                <input
                  disabled={busy}
                  className={`${inputClass} mt-1 ${colorErrors.name ? "border-danger focus:border-danger" : ""}`}
                  value={colorForm.name}
                  onChange={(event) => {
                    setColorForm({ ...colorForm, name: event.target.value });
                    if (colorErrors.name) setColorErrors((c) => ({ ...c, name: null }));
                  }}
                />
              </Field>
              <Field label="Slug">
                <input
                  disabled={busy}
                  className={`${inputClass} mt-1`}
                  placeholder="Automatique si vide"
                  value={colorForm.slug}
                  onChange={(event) => setColorForm({ ...colorForm, slug: event.target.value })}
                />
              </Field>
              <Field label="Couleur" required error={colorErrors.hex_value}>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    disabled={busy}
                    className="h-10 w-12 shrink-0 cursor-pointer border border-line bg-transparent p-1"
                    value={colorForm.hex_value}
                    onChange={(event) => {
                      setColorForm({ ...colorForm, hex_value: event.target.value.toUpperCase() });
                      if (colorErrors.hex_value) setColorErrors((c) => ({ ...c, hex_value: null }));
                    }}
                    aria-label="Choisir la couleur"
                  />
                  <input
                    disabled={busy}
                    className={`${inputClass} ${colorErrors.hex_value ? "border-danger focus:border-danger" : ""}`}
                    value={colorForm.hex_value}
                    onChange={(event) => {
                      setColorForm({ ...colorForm, hex_value: event.target.value });
                      if (colorErrors.hex_value) setColorErrors((c) => ({ ...c, hex_value: null }));
                    }}
                  />
                </div>
              </Field>
              <Field label="Ordre" error={colorErrors.display_order}>
                <input
                  type="number"
                  min="0"
                  disabled={busy}
                  className={`${inputClass} mt-1 ${colorErrors.display_order ? "border-danger focus:border-danger" : ""}`}
                  value={colorForm.display_order}
                  onChange={(event) => {
                    setColorForm({ ...colorForm, display_order: event.target.value });
                    if (colorErrors.display_order) setColorErrors((c) => ({ ...c, display_order: null }));
                  }}
                />
              </Field>
              <label className="flex items-center gap-2.5 text-sm text-fg sm:col-span-2">
                <input type="checkbox" disabled={busy} checked={colorForm.is_active} onChange={(event) => setColorForm({ ...colorForm, is_active: event.target.checked })} />
                Disponible pour les nouvelles variantes
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                <button disabled={busy} className={`${buttonClass} w-full sm:w-auto`}>
                  {busy ? "Enregistrement…" : editingColor ? "Enregistrer" : "Ajouter la couleur"}
                </button>
                {editingColor && <button type="button" disabled={busy} className={`${ghostButtonClass} w-full sm:w-auto`} onClick={resetColor}>Annuler</button>}
              </div>
            </form>

            <div className="mt-7 divide-y divide-line border-t border-line">
              {colors.length === 0 ? <AdminEmpty>Aucune couleur.</AdminEmpty> : colors.map((color) => (
                <article key={color.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-8 w-8 shrink-0 border border-line" style={{ backgroundColor: color.hex_value }} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="font-medium text-fg">{color.name}</div>
                      <div className="mt-0.5 text-xs text-muted">{color.slug} · {color.hex_value}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <AdminStatus tone={color.is_active ? "success" : "neutral"}>{color.is_active ? "Active" : "Masquée"}</AdminStatus>
                    <button type="button" className="lnk" onClick={() => editColor(color)}>Modifier</button>
                    <button type="button" className="lnk text-danger" onClick={() => removeColor(color)}>Supprimer</button>
                  </div>
                </article>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="font-display text-2xl font-light text-fg">Tailles</h2>
            <p className="mt-1 text-sm text-muted">Le code est utilisé comme identifiant métier, le libellé est affiché au client.</p>

            <form onSubmit={saveSize} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Code" required error={sizeErrors.code}>
                <input
                  disabled={busy}
                  className={`${inputClass} mt-1 ${sizeErrors.code ? "border-danger focus:border-danger" : ""}`}
                  placeholder="M, 40, TU…"
                  value={sizeForm.code}
                  onChange={(event) => {
                    setSizeForm({ ...sizeForm, code: event.target.value });
                    if (sizeErrors.code) setSizeErrors((c) => ({ ...c, code: null }));
                  }}
                />
              </Field>
              <Field label="Libellé" required error={sizeErrors.label}>
                <input
                  disabled={busy}
                  className={`${inputClass} mt-1 ${sizeErrors.label ? "border-danger focus:border-danger" : ""}`}
                  value={sizeForm.label}
                  onChange={(event) => {
                    setSizeForm({ ...sizeForm, label: event.target.value });
                    if (sizeErrors.label) setSizeErrors((c) => ({ ...c, label: null }));
                  }}
                />
              </Field>
              <Field label="Ordre" error={sizeErrors.display_order}>
                <input
                  type="number"
                  min="0"
                  disabled={busy}
                  className={`${inputClass} mt-1 ${sizeErrors.display_order ? "border-danger focus:border-danger" : ""}`}
                  value={sizeForm.display_order}
                  onChange={(event) => {
                    setSizeForm({ ...sizeForm, display_order: event.target.value });
                    if (sizeErrors.display_order) setSizeErrors((c) => ({ ...c, display_order: null }));
                  }}
                />
              </Field>
              <label className="flex items-end gap-2.5 pb-2 text-sm text-fg">
                <input type="checkbox" disabled={busy} checked={sizeForm.is_active} onChange={(event) => setSizeForm({ ...sizeForm, is_active: event.target.checked })} />
                Disponible
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                <button disabled={busy} className={`${buttonClass} w-full sm:w-auto`}>
                  {busy ? "Enregistrement…" : editingSize ? "Enregistrer" : "Ajouter la taille"}
                </button>
                {editingSize && <button type="button" disabled={busy} className={`${ghostButtonClass} w-full sm:w-auto`} onClick={resetSize}>Annuler</button>}
              </div>
            </form>

            <div className="mt-7 divide-y divide-line border-t border-line">
              {sizes.length === 0 ? <AdminEmpty>Aucune taille.</AdminEmpty> : sizes.map((size) => (
                <article key={size.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-fg">{size.label}</div>
                    <div className="mt-0.5 text-xs text-muted">Code {size.code} · ordre {size.display_order}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <AdminStatus tone={size.is_active ? "success" : "neutral"}>{size.is_active ? "Active" : "Masquée"}</AdminStatus>
                    <button type="button" className="lnk" onClick={() => editSize(size)}>Modifier</button>
                    <button type="button" className="lnk text-danger" onClick={() => removeSize(size)}>Supprimer</button>
                  </div>
                </article>
              ))}
            </div>
          </AdminCard>
        </div>
      )}
    </>
  );
}
