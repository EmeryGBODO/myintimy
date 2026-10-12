import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin.js";
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminStatus,
  AdminTitle,
  buttonClass,
  inputClass,
} from "../../admin/AdminUI.jsx";
import { formatDateTime } from "../../admin/format.js";

function availabilityTone(quantity) {
  if (quantity <= 0) return "danger";
  if (quantity <= 5) return "warning";
  return "success";
}

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [delta, setDelta] = useState({});
  const [historyVariant, setHistoryVariant] = useState(null);
  const [movements, setMovements] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await adminApi.inventory();
      setItems(response.items || []);
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((variant) =>
      `${variant.product.name} ${variant.sku} ${variant.color.name} ${variant.size?.label || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [items, q]);

  async function adjust(variant) {
    const value = Number(delta[variant.id] || 0);
    if (!value) return;

    try {
      await adminApi.adjustStock(variant.id, {
        delta: value,
        reason: "Ajustement manuel depuis le back-office",
      });
      setDelta((current) => ({ ...current, [variant.id]: "" }));
      await load();
    } catch (err) {
      setError(err);
    }
  }

  async function showHistory(variant) {
    setHistoryVariant(variant);
    setHistoryLoading(true);
    setError(null);
    try {
      setMovements(await adminApi.movements(variant.id));
    } catch (err) {
      setError(err);
      setMovements([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <>
      <AdminTitle title="Stocks" subtitle="Chaque ajustement crée un mouvement d’inventaire traçable." />
      <AdminError error={error} />

      <label className="mb-6 block max-w-xl">
        <span className="field-label">Recherche</span>
        <input
          className={`${inputClass} mt-1`}
          placeholder="Produit, SKU, couleur ou taille…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </label>

      <AdminCard className="p-0">
        {loading ? (
          <AdminLoading />
        ) : filtered.length === 0 ? (
          <AdminEmpty>Aucune variante ne correspond à votre recherche.</AdminEmpty>
        ) : (
          <>
            <div className="divide-y divide-line lg:hidden">
              {filtered.map((variant) => (
                <article key={variant.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl font-light leading-tight text-fg">{variant.product.name}</h2>
                      <p className="mt-1 break-all font-mono text-[11px] text-muted">{variant.sku}</p>
                    </div>
                    <AdminStatus tone={availabilityTone(variant.available_quantity)}>
                      {variant.available_quantity <= 0 ? "Rupture" : `${variant.available_quantity} dispo.`}
                    </AdminStatus>
                  </div>

                  <div className="mt-4 text-sm text-fg">
                    {variant.color.name}{variant.size ? ` / ${variant.size.label}` : ""}
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Stock</dt>
                      <dd className="mt-0.5 text-fg">{variant.stock_quantity}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Réservé</dt>
                      <dd className="mt-0.5 text-fg">{variant.reserved_quantity}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Disponible</dt>
                      <dd className="mt-0.5 text-fg">{variant.available_quantity}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 border-t border-line pt-4">
                    <div className="flex items-end gap-2">
                      <label className="min-w-0 flex-1">
                        <span className="field-label">Ajustement</span>
                        <input
                          className={`${inputClass} mt-1`}
                          type="number"
                          placeholder="+5 / -2"
                          value={delta[variant.id] ?? ""}
                          onChange={(event) => setDelta((current) => ({ ...current, [variant.id]: event.target.value }))}
                        />
                      </label>
                      <button className={buttonClass} onClick={() => adjust(variant)}>Valider</button>
                    </div>
                    <button type="button" className="lnk mt-4" onClick={() => showHistory(variant)}>Voir l’historique</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="border-b border-line bg-surface/55 text-left text-[10px] uppercase tracking-[.14em] text-muted">
                  <tr>
                    <th className="p-4 font-normal">Produit / SKU</th>
                    <th className="px-3 py-4 font-normal">Variante</th>
                    <th className="px-3 py-4 font-normal">Stock</th>
                    <th className="px-3 py-4 font-normal">Réservé</th>
                    <th className="px-3 py-4 font-normal">Disponible</th>
                    <th className="p-4 font-normal">Ajuster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((variant) => (
                    <tr key={variant.id} className="transition-colors hover:bg-surface/40">
                      <td className="p-4">
                        <div className="font-medium text-fg">{variant.product.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted">{variant.sku}</div>
                      </td>
                      <td className="px-3 py-4">{variant.color.name}{variant.size ? ` / ${variant.size.label}` : ""}</td>
                      <td className="px-3 py-4">{variant.stock_quantity}</td>
                      <td className="px-3 py-4">{variant.reserved_quantity}</td>
                      <td className="px-3 py-4">
                        <AdminStatus tone={availabilityTone(variant.available_quantity)}>
                          {variant.available_quantity}
                        </AdminStatus>
                      </td>
                      <td className="p-4">
                        <div className="flex max-w-[260px] flex-col gap-2">
                          <div className="flex items-end gap-2">
                            <input
                              className={inputClass}
                              type="number"
                              aria-label={`Ajustement de stock pour ${variant.sku}`}
                              placeholder="+5 / -2"
                              value={delta[variant.id] ?? ""}
                              onChange={(event) => setDelta((current) => ({ ...current, [variant.id]: event.target.value }))}
                            />
                            <button className={buttonClass} onClick={() => adjust(variant)}>OK</button>
                          </div>
                          <button type="button" className="lnk self-start" onClick={() => showHistory(variant)}>Historique</button>
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

      {historyVariant && (
        <AdminCard className="mt-6">
          <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow mb-1">Historique du stock</p>
              <h2 className="font-display text-2xl font-light text-fg">{historyVariant.product.name}</h2>
              <p className="mt-1 text-xs text-muted">{historyVariant.sku} · {historyVariant.color.name}{historyVariant.size ? ` / ${historyVariant.size.label}` : ""}</p>
            </div>
            <button type="button" className="lnk self-start" onClick={() => { setHistoryVariant(null); setMovements([]); }}>Fermer</button>
          </div>

          {historyLoading ? (
            <AdminLoading />
          ) : movements.length === 0 ? (
            <AdminEmpty>Aucun mouvement enregistré pour cette variante.</AdminEmpty>
          ) : (
            <div className="divide-y divide-line">
              {movements.map((movement) => (
                <article key={movement.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{movement.reason || "Mouvement de stock"}</span>
                      <AdminStatus tone={movement.quantity_delta < 0 ? "warning" : "success"}>
                        {movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}
                      </AdminStatus>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {formatDateTime(movement.created_at)} · stock après mouvement : {movement.quantity_after}
                      {movement.reference ? ` · réf. ${movement.reference}` : ""}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-[.12em] text-muted">{movement.movement_type.replaceAll("_", " ")}</div>
                </article>
              ))}
            </div>
          )}
        </AdminCard>
      )}
    </>
  );
}
