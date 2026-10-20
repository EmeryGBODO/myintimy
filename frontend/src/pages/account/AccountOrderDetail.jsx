import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { customerApi } from "../../api/customer.js";
import { formatPrice } from "../../data/catalog.js";
import { InlineError, InlineLoading } from "../../components/Shared.jsx";

const labels = {
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  pending_payment: "Paiement en attente",
};

export default function AccountOrderDetail() {
  const { reference } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.orders.get(reference);
      setOrder(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <InlineLoading message="Chargement des détails de la commande…" />;
  }

  if (error || !order) {
    return (
      <div className="grid gap-6">
        <InlineError error={error || new Error("Commande introuvable.")} onRetry={load} />
        <Link to="/compte/commandes" className="btn btn-ghost justify-self-start">
          &larr; Retour aux commandes
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Commande</p>
          <h2 className="mt-2 text-4xl">{order.reference}</h2>
        </div>
        <span className="font-sans text-xs uppercase tracking-[.16em] text-accent">
          {labels[order.status] || order.status}
        </span>
      </div>

      <div className="grid gap-4">
        {order.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 border-b border-line pb-4">
            <div>
              <h3 className="text-xl font-normal text-fg">{item.product_name}</h3>
              <p className="text-sm text-muted">
                {item.color_name}
                {item.size_code ? ` · ${item.size_code}` : ""} · ×{item.quantity}
              </p>
            </div>
            <span className="tabular-nums text-fg">{formatPrice(item.line_total_xof)}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-2 bg-surface p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Sous-total</span>
          <span className="tabular-nums text-fg">{formatPrice(order.subtotal_xof)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Livraison</span>
          <span className="tabular-nums text-fg">
            {order.shipping_xof ? formatPrice(order.shipping_xof) : "Offerte"}
          </span>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
          <span className="text-fg">Total</span>
          <b className="tabular-nums text-fg">{formatPrice(order.total_xof)}</b>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-line p-5">
          <p className="eyebrow">Livraison</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            <strong className="text-fg">{order.customer_name}</strong>
            <br />
            {order.customer_phone}
            <br />
            {order.area}, {order.city}
            <br />
            {order.address}
          </p>
        </div>
        <div className="border border-line p-5">
          <p className="eyebrow">Suivi</p>
          <div className="mt-3 grid gap-3">
            {order.history && order.history.length > 0 ? (
              order.history.map((h) => (
                <div key={h.id} className="border-l border-accent pl-3">
                  <p className="text-sm font-medium text-fg">{labels[h.to_status] || h.to_status}</p>
                  <p className="text-xs text-muted">{new Date(h.created_at).toLocaleString("fr-FR")}</p>
                  {h.note && <p className="mt-1 text-xs text-muted">{h.note}</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">Aucun historique disponible.</p>
            )}
          </div>
        </div>
      </div>

      <Link to="/compte/commandes" className="btn btn-ghost justify-self-start">
        &larr; Retour aux commandes
      </Link>
    </div>
  );
}
