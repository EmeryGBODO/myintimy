import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { formatXof } from "../../admin/format.js";

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load(search = q) {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.products(search);
      setItems(response.items || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <AdminTitle
        title="Produits"
        subtitle={`${items.length} produit(s) affiché(s).`}
        action={<Link to="/admin/products/new" className={buttonClass}>Ajouter un produit</Link>}
      />
      <AdminError error={error} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 flex-1">
          <span className="field-label">Recherche</span>
          <input
            className={`${inputClass} mt-1`}
            placeholder="Nom ou slug…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </label>
        <button className={`${buttonClass} w-full sm:w-auto`}>Rechercher</button>
      </form>

      <AdminCard className="p-0">
        {loading ? (
          <AdminLoading />
        ) : items.length === 0 ? (
          <AdminEmpty>Aucun produit ne correspond à votre recherche.</AdminEmpty>
        ) : (
          <>
            <div className="divide-y divide-line md:hidden">
              {items.map((product) => (
                <article key={product.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-2xl font-light leading-tight text-fg">{product.name}</h2>
                      <p className="mt-1 truncate text-xs text-muted">{product.slug}</p>
                    </div>
                    <AdminStatus tone={product.is_active ? "success" : "neutral"}>
                      {product.is_active ? "Actif" : "Masqué"}
                    </AdminStatus>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Catégorie</dt>
                      <dd className="mt-0.5 text-fg">{product.category.title}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Prix</dt>
                      <dd className="mt-0.5 text-fg">{formatXof(product.price_xof)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Variantes</dt>
                      <dd className="mt-0.5 text-fg">{product.variant_count}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Stock disponible</dt>
                      <dd className="mt-0.5 text-fg">{product.available_quantity}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 border-t border-line pt-4 text-right">
                    <Link className="lnk text-fg" to={`/admin/products/${product.id}`}>Modifier</Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line bg-surface/55 text-[10px] uppercase tracking-[.14em] text-muted">
                  <tr>
                    <th className="p-4 font-normal">Produit</th>
                    <th className="px-3 py-4 font-normal">Catégorie</th>
                    <th className="px-3 py-4 font-normal">Prix</th>
                    <th className="px-3 py-4 font-normal">Variantes</th>
                    <th className="px-3 py-4 font-normal">Stock dispo.</th>
                    <th className="px-3 py-4 font-normal">État</th>
                    <th className="p-4 font-normal" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-surface/40">
                      <td className="p-4">
                        <div className="font-medium text-fg">{product.name}</div>
                        <div className="mt-0.5 text-xs text-muted">{product.slug}</div>
                      </td>
                      <td className="px-3 py-4">{product.category.title}</td>
                      <td className="px-3 py-4 whitespace-nowrap">{formatXof(product.price_xof)}</td>
                      <td className="px-3 py-4">{product.variant_count}</td>
                      <td className="px-3 py-4">{product.available_quantity}</td>
                      <td className="px-3 py-4">
                        <AdminStatus tone={product.is_active ? "success" : "neutral"}>
                          {product.is_active ? "Actif" : "Masqué"}
                        </AdminStatus>
                      </td>
                      <td className="p-4 text-right">
                        <Link className="lnk" to={`/admin/products/${product.id}`}>Modifier</Link>
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
