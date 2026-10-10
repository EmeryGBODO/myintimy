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

                  <div className="mt-5 flex items-end gap-2 border-t border-line pt-4">
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
                        <div className="flex max-w-[230px] items-end gap-2">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminCard>
    </>
  );
}
