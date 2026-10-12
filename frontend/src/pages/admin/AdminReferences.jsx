import { useEffect, useState } from "react";
import { adminApi } from "../../api/admin.js";
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export default function AdminReferences() {
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colorForm, setColorForm] = useState(EMPTY_COLOR);
  const [sizeForm, setSizeForm] = useState(EMPTY_SIZE);
  const [editingColor, setEditingColor] = useState(null);
  const [editingSize, setEditingSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []);

  function resetColor() {
    setEditingColor(null);
    setColorForm(EMPTY_COLOR);
  }

  function resetSize() {
    setEditingSize(null);
    setSizeForm(EMPTY_SIZE);
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
  }

  function editSize(size) {
    setEditingSize(size.id);
    setSizeForm({
      code: size.code,
      label: size.label,
      display_order: size.display_order,
      is_active: size.is_active,
    });
  }

  async function saveColor(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { ...colorForm, display_order: Number(colorForm.display_order || 0) };
      if (!payload.slug) delete payload.slug;
      if (editingColor) await adminApi.updateColor(editingColor, payload);
      else await adminApi.createColor(payload);
      resetColor();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function saveSize(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { ...sizeForm, display_order: Number(sizeForm.display_order || 0) };
      if (editingSize) await adminApi.updateSize(editingSize, payload);
      else await adminApi.createSize(payload);
      resetSize();
      await load();
    } catch (err) {
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
      <AdminError error={error} />

      {loading ? (
        <AdminLoading />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminCard>
            <h2 className="font-display text-2xl font-light text-fg">Couleurs</h2>
            <p className="mt-1 text-sm text-muted">Le code hexadécimal sert aussi à l’aperçu dans l’administration.</p>

            <form onSubmit={saveColor} className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Nom">
                <input required className={`${inputClass} mt-1`} value={colorForm.name} onChange={(event) => setColorForm({ ...colorForm, name: event.target.value })} />
              </Field>
              <Field label="Slug">
                <input className={`${inputClass} mt-1`} placeholder="Automatique si vide" value={colorForm.slug} onChange={(event) => setColorForm({ ...colorForm, slug: event.target.value })} />
              </Field>
              <Field label="Couleur">
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-12 shrink-0 cursor-pointer border border-line bg-transparent p-1"
                    value={colorForm.hex_value}
                    onChange={(event) => setColorForm({ ...colorForm, hex_value: event.target.value.toUpperCase() })}
                    aria-label="Choisir la couleur"
                  />
                  <input required pattern="#[0-9A-Fa-f]{6}" className={inputClass} value={colorForm.hex_value} onChange={(event) => setColorForm({ ...colorForm, hex_value: event.target.value })} />
                </div>
              </Field>
              <Field label="Ordre">
                <input type="number" className={`${inputClass} mt-1`} value={colorForm.display_order} onChange={(event) => setColorForm({ ...colorForm, display_order: event.target.value })} />
              </Field>
              <label className="flex items-center gap-2.5 text-sm text-fg sm:col-span-2">
                <input type="checkbox" checked={colorForm.is_active} onChange={(event) => setColorForm({ ...colorForm, is_active: event.target.checked })} />
                Disponible pour les nouvelles variantes
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                <button disabled={busy} className={`${buttonClass} w-full sm:w-auto`}>{editingColor ? "Enregistrer" : "Ajouter la couleur"}</button>
                {editingColor && <button type="button" className={`${ghostButtonClass} w-full sm:w-auto`} onClick={resetColor}>Annuler</button>}
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

            <form onSubmit={saveSize} className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Code">
                <input required className={`${inputClass} mt-1`} placeholder="M, 40, TU…" value={sizeForm.code} onChange={(event) => setSizeForm({ ...sizeForm, code: event.target.value })} />
              </Field>
              <Field label="Libellé">
                <input required className={`${inputClass} mt-1`} value={sizeForm.label} onChange={(event) => setSizeForm({ ...sizeForm, label: event.target.value })} />
              </Field>
              <Field label="Ordre">
                <input type="number" className={`${inputClass} mt-1`} value={sizeForm.display_order} onChange={(event) => setSizeForm({ ...sizeForm, display_order: event.target.value })} />
              </Field>
              <label className="flex items-end gap-2.5 pb-2 text-sm text-fg">
                <input type="checkbox" checked={sizeForm.is_active} onChange={(event) => setSizeForm({ ...sizeForm, is_active: event.target.checked })} />
                Disponible
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                <button disabled={busy} className={`${buttonClass} w-full sm:w-auto`}>{editingSize ? "Enregistrer" : "Ajouter la taille"}</button>
                {editingSize && <button type="button" className={`${ghostButtonClass} w-full sm:w-auto`} onClick={resetSize}>Annuler</button>}
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
