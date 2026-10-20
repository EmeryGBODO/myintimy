import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/admin.js";
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminStatus,
  AdminTitle,
  buttonClass,
  dangerButtonClass,
  ghostButtonClass,
  inputClass,
} from "../../admin/AdminUI.jsx";

const EMPTY = { title: "", slug: "", subtitle: "", display_order: 0, is_active: true };

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await adminApi.categories());
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

  function startEdit(category) {
    setEditing(category.id);
    setForm({
      title: category.title,
      slug: category.slug,
      subtitle: category.subtitle,
      display_order: category.display_order,
      is_active: category.is_active,
    });
  }

  function reset() {
    setEditing(null);
    setForm(EMPTY);
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    try {
      const payload = { ...form, display_order: Number(form.display_order) };
      if (!payload.slug) delete payload.slug;

      if (editing) await adminApi.updateCategory(editing, payload);
      else await adminApi.createCategory(payload);

      reset();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (deletingId) return;
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await adminApi.deleteCategory(id);
      if (editing === id) reset();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <AdminTitle title="Catégories" subtitle="Structure principale du catalogue." />
      <AdminError error={error} onRetry={load} />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <AdminCard className="xl:sticky xl:top-8">
          <h2 className="mb-5 font-display text-2xl font-light text-fg">
            {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </h2>

          <form onSubmit={save} className="space-y-5">
            <label className="block">
              <span className="field-label">Nom</span>
              <input
                className={`${inputClass} mt-1`}
                required
                disabled={busy}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="field-label">Slug <span className="normal-case tracking-normal text-muted">(optionnel)</span></span>
              <input
                className={`${inputClass} mt-1`}
                disabled={busy}
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="field-label">Sous-titre</span>
              <textarea
                className={`${inputClass} mt-1 resize-y`}
                rows="3"
                disabled={busy}
                value={form.subtitle}
                onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="field-label">Ordre</span>
              <input
                className={`${inputClass} mt-1`}
                type="number"
                disabled={busy}
                value={form.display_order}
                onChange={(event) => setForm({ ...form, display_order: event.target.value })}
              />
            </label>

            <label className="flex items-center gap-2.5 text-sm text-fg">
              <input
                type="checkbox"
                disabled={busy}
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              Catégorie active
            </label>

            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <button disabled={busy} className={`${buttonClass} w-full`}>
                {busy ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
              </button>
              {editing && (
                <button
                  type="button"
                  disabled={busy}
                  className={`${ghostButtonClass} w-full`}
                  onClick={reset}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </AdminCard>

        <AdminCard className="p-0">
          {loading ? (
            <AdminLoading message="Chargement des catégories…" />
          ) : items.length === 0 ? (
            <AdminEmpty>Aucune catégorie pour le moment.</AdminEmpty>
          ) : (
            <>
              <div className="divide-y divide-line md:hidden">
                {items.map((category) => (
                  <article key={category.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-2xl font-light leading-tight text-fg">{category.title}</h2>
                        <p className="mt-1 truncate text-xs text-muted">{category.slug}</p>
                      </div>
                      <AdminStatus tone={category.is_active ? "success" : "neutral"}>
                        {category.is_active ? "Active" : "Masquée"}
                      </AdminStatus>
                    </div>

                    <div className="mt-4 text-sm text-muted">Ordre d’affichage : <span className="text-fg">{category.display_order}</span></div>

                    <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                      <button
                        className={ghostButtonClass}
                        disabled={busy || deletingId === category.id}
                        onClick={() => startEdit(category)}
                      >
                        Modifier
                      </button>
                      <button
                        className={dangerButtonClass}
                        disabled={busy || deletingId === category.id}
                        onClick={() => remove(category.id)}
                      >
                        {deletingId === category.id ? "Suppression…" : "Supprimer"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="border-b border-line bg-surface/55 text-left text-[10px] uppercase tracking-[.14em] text-muted">
                    <tr>
                      <th className="p-4 font-normal">Catégorie</th>
                      <th className="px-3 py-4 font-normal">Ordre</th>
                      <th className="px-3 py-4 font-normal">État</th>
                      <th className="p-4 font-normal" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((category) => (
                      <tr key={category.id} className="transition-colors hover:bg-surface/40">
                        <td className="p-4">
                          <div className="font-medium text-fg">{category.title}</div>
                          <div className="mt-0.5 text-xs text-muted">{category.slug}</div>
                        </td>
                        <td className="px-3 py-4">{category.display_order}</td>
                        <td className="px-3 py-4">
                          <AdminStatus tone={category.is_active ? "success" : "neutral"}>
                            {category.is_active ? "Active" : "Masquée"}
                          </AdminStatus>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-4">
                            <button
                              className="lnk disabled:opacity-50"
                              disabled={busy || deletingId === category.id}
                              onClick={() => startEdit(category)}
                            >
                              Modifier
                            </button>
                            <button
                              className="lnk text-danger disabled:opacity-50"
                              disabled={busy || deletingId === category.id}
                              onClick={() => remove(category.id)}
                            >
                              {deletingId === category.id ? "Suppression…" : "Supprimer"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AdminCard>
      </div>
    </>
  );
}
