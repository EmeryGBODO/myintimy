import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin.js";
import { AdminCard, AdminEmpty, AdminError, AdminLoading, AdminStatus, AdminTitle, inputClass } from "../../admin/AdminUI.jsx";
import { formatDateTime, formatXof } from "../../admin/format.js";
import { ORDER_STATUS, orderStatus } from "../../admin/orders.js";

export default function AdminOrders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.orders({ q, status });
      setItems(response.items || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const timer = setTimeout(load, 180);
    return () => clearTimeout(timer);
  }, [load]);

  const countLabel = useMemo(() => `${items.length} commande${items.length > 1 ? "s" : ""}`, [items.length]);

  return (
    <>
      <AdminTitle title="Commandes" subtitle="Suivez les commandes, leur préparation et l’évolution du stock réservé." />
      <AdminError error={error} onRetry={load} />

      <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <label>
          <span className="field-label">Recherche</span>
          <input className={`${inputClass} mt-1`} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Référence, client, téléphone…" />
        </label>
        <label>
          <span className="field-label">Statut</span>
          <select className={`${inputClass} mt-1`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(ORDER_STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </select>
        </label>
      </div>

      <p className="mb-3 text-xs uppercase tracking-[.12em] text-muted">{countLabel}</p>
      <AdminCard className="p-0">
        {loading ? <AdminLoading message="Recherche des commandes…" /> : items.length === 0 ? <AdminEmpty>Aucune commande ne correspond aux filtres.</AdminEmpty> : (
          <>
            <div className="divide-y divide-line md:hidden">
              {items.map((order) => {
                const meta = orderStatus(order.status);
                return (
                  <Link key={order.id} to={`/admin/orders/${order.id}`} className="block p-4 transition-colors hover:bg-surface/60 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs text-muted">{order.reference}</div>
                        <h2 className="mt-1 font-display text-2xl font-light text-fg">{order.customer_name}</h2>
                      </div>
                      <AdminStatus tone={meta.tone}>{meta.label}</AdminStatus>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="block text-xs text-muted">Date</span>{formatDateTime(order.created_at)}</div>
                      <div><span className="block text-xs text-muted">Total</span>{formatXof(order.total_xof)}</div>
                      <div><span className="block text-xs text-muted">Articles</span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                      <div><span className="block text-xs text-muted">Ville</span>{order.city}</div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="border-b border-line bg-surface/55 text-left text-[10px] uppercase tracking-[.14em] text-muted">
                  <tr>
                    <th className="p-4 font-normal">Commande</th>
                    <th className="px-3 py-4 font-normal">Client</th>
                    <th className="px-3 py-4 font-normal">Date</th>
                    <th className="px-3 py-4 font-normal">Statut</th>
                    <th className="px-3 py-4 font-normal">Articles</th>
                    <th className="p-4 text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((order) => {
                    const meta = orderStatus(order.status);
                    return (
                      <tr key={order.id} className="transition-colors hover:bg-surface/40">
                        <td className="p-4"><Link to={`/admin/orders/${order.id}`} className="lnk font-mono text-xs">{order.reference}</Link></td>
                        <td className="px-3 py-4"><div className="text-fg">{order.customer_name}</div><div className="text-xs text-muted">{order.customer_phone}</div></td>
                        <td className="px-3 py-4 text-muted">{formatDateTime(order.created_at)}</td>
                        <td className="px-3 py-4"><AdminStatus tone={meta.tone}>{meta.label}</AdminStatus></td>
                        <td className="px-3 py-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                        <td className="p-4 text-right tabular-nums">{formatXof(order.total_xof)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminCard>
    </>
  );
}
