import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function AccountOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await customerApi.orders.list();
      setOrders(items || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="eyebrow">Historique</p>
        <h2 className="mt-2 text-4xl">Vos commandes</h2>
      </div>

      <InlineError error={error} onRetry={load} />

      {loading ? (
        <InlineLoading message="Chargement de vos commandes…" />
      ) : orders.length === 0 ? (
        <div className="grid justify-items-center gap-4 border border-line p-10 text-center text-muted">
          <p className="text-base text-fg">Aucune commande pour le moment</p>
          <p className="max-w-md text-sm">
            Vos prochaines commandes validées apparaîtront ici avec leur suivi détaillé et l’historique de livraison.
          </p>
          <Link to="/categorie/nouveautes" className="btn btn-ghost mt-2">
            Découvrir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              to={`/compte/commandes/${o.reference}`}
              className="grid gap-3 border border-line p-5 transition-colors hover:bg-surface sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <b className="font-display text-xl font-normal text-fg">{o.reference}</b>
                <p className="text-xs text-muted">
                  {new Date(o.created_at).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span className="text-sm text-muted">{labels[o.status] || o.status}</span>
              <b className="font-normal tabular-nums text-fg">{formatPrice(o.total_xof)}</b>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
