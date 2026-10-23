import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../api/admin.js";
import { AdminCard, AdminError, AdminLoading, AdminStatus, AdminTitle, buttonClass, dangerButtonClass } from "../../admin/AdminUI.jsx";
import { formatDateTime, formatXof } from "../../admin/format.js";
import { ORDER_TRANSITIONS, orderStatus } from "../../admin/orders.js";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrder(await adminApi.order(id));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function transition(status) {
    if (updating) return;
    setUpdating(true);
    try {
      const meta = orderStatus(status);
      const note = window.prompt(`Note pour le passage à « ${meta.label} » (facultatif) :`, "") || null;
      setOrder(await adminApi.updateOrderStatus(id, { status, note }));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <AdminLoading message="Chargement de la commande…" />;
  if (!order) return <AdminError error={error || new Error("Commande introuvable.")} onRetry={load} />;

  const statusMeta = orderStatus(order.status);
  const transitions = ORDER_TRANSITIONS[order.status] || [];

  return (
    <>
      <AdminTitle
        title={order.reference}
        subtitle={`Commande de ${order.customer_name} · ${formatDateTime(order.created_at)}`}
        action={<Link to="/admin/orders" className="lnk">Retour aux commandes</Link>}
      />
      <AdminError error={error} onRetry={load} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <div className="grid gap-6">
          <AdminCard>
            <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="eyebrow mb-1">État de la commande</p><AdminStatus tone={statusMeta.tone}>{statusMeta.label}</AdminStatus></div>
              {transitions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {transitions.map((status) => {
                    const meta = orderStatus(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={updating}
                        className={status === "cancelled" ? dangerButtonClass : buttonClass}
                        onClick={() => transition(status)}
                      >
                        {updating ? "Mise à jour…" : meta.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <div className="font-display text-xl font-light text-fg">{item.product_name}</div>
                    <div className="mt-1 text-xs text-muted">{item.color_name}{item.size_code ? ` · ${item.size_code}` : ""} · SKU {item.sku} · ×{item.quantity}</div>
                  </div>
                  <div className="text-sm tabular-nums text-fg">{formatXof(item.line_total_xof)}</div>
                </div>
              ))}
            </div>

            <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4 text-muted"><dt>Sous-total</dt><dd>{formatXof(order.subtotal_xof)}</dd></div>
              <div className="flex justify-between gap-4 text-muted"><dt>Livraison</dt><dd>{order.shipping_xof ? formatXof(order.shipping_xof) : "Offerte"}</dd></div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base text-fg"><dt>Total</dt><dd>{formatXof(order.total_xof)}</dd></div>
            </dl>
          </AdminCard>

          <AdminCard>
            <p className="eyebrow mb-3">Historique</p>
            <div className="divide-y divide-line">
              {[...order.history].reverse().map((entry) => {
                const meta = orderStatus(entry.to_status);
                return (
                  <div key={entry.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div><AdminStatus tone={meta.tone}>{meta.label}</AdminStatus>{entry.note && <p className="mt-2 text-sm text-fg">{entry.note}</p>}</div>
                    <time className="text-xs text-muted">{formatDateTime(entry.created_at)}</time>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        </div>

        <div className="grid content-start gap-6">
          <AdminCard>
            <p className="eyebrow mb-3">Client</p>
            <dl className="grid gap-3 text-sm">
              <div><dt className="text-xs text-muted">Nom</dt><dd>{order.customer_name}</dd></div>
              <div><dt className="text-xs text-muted">Téléphone</dt><dd>{order.customer_phone}</dd></div>
              <div><dt className="text-xs text-muted">E-mail</dt><dd>{order.customer_email || "—"}</dd></div>
            </dl>
          </AdminCard>
          <AdminCard>
            <p className="eyebrow mb-3">Livraison</p>
            <div className="text-sm leading-relaxed text-fg">{order.address}<br />{order.area}<br />{order.city}</div>
            <p className="mt-3 text-xs text-muted">Emballage neutre : {order.neutral_packaging ? "Oui" : "Non"}</p>
          </AdminCard>
          <AdminCard>
            <p className="eyebrow mb-3">Paiement</p>
            <p className="text-sm text-fg">Paiement à la livraison</p>
            <p className="mt-1 text-xs text-muted">Statut : {order.payment_status}</p>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
