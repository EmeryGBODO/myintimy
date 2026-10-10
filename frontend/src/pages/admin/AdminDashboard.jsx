import { useEffect, useState } from "react";
import { adminApi } from "../../api/admin.js";
import { AdminCard, AdminError, AdminLoading, AdminTitle } from "../../admin/AdminUI.jsx";

const CARDS = [
  ["products_total", "Produits"],
  ["products_active", "Produits actifs"],
  ["categories_total", "Catégories"],
  ["variants_total", "Variantes"],
  ["stock_units_total", "Unités en stock"],
  ["low_stock_variants", "Stock faible"],
  ["out_of_stock_variants", "Ruptures"],
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(setError);
  }, []);

  return (
    <>
      <AdminTitle title="Tableau de bord" subtitle="Vue synthétique du catalogue et du stock." />
      <AdminError error={error} />

      {!data ? (
        <AdminLoading />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {CARDS.map(([key, label]) => (
            <AdminCard key={key} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-accent/60" />
              <div className="text-xs uppercase tracking-[.12em] text-muted">{label}</div>
              <div className="mt-3 font-display text-4xl font-light leading-none text-fg sm:text-5xl">
                {data[key]}
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </>
  );
}
