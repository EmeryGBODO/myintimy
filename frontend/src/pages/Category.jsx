import { useMemo, useState } from "react";
import { CATEGORIES, COLORS, PRODUCTS, SIZES } from "../data/catalog.js";
import { EmptyState, PageHead, Perks, ProductCard, ProductGrid } from "../components/Shared.jsx";
import { AgeGate } from "../components/Overlays.jsx";
import { useShop } from "../context/shop-context.js";

const PRICE = { all: () => true, lo: (p) => p < 25000, mid: (p) => p >= 25000 && p <= 50000, hi: (p) => p > 50000 };
const SORT = { sel: null, asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, new: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) };

export default function Category({ cat }) {
  const { ageOk } = useShop();
  const meta = CATEGORIES[cat];
  const isCouple = cat === "couple";
  const base = useMemo(() => (cat === "nouveautes" ? PRODUCTS.filter((p) => p.isNew) : PRODUCTS.filter((p) => p.category === cat)), [cat]);
  const colors = [...new Set(base.flatMap((p) => p.colors))];

  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("sel");

  const list = useMemo(() => {
    const l = base.filter((p) =>
      (!size || p.sizes?.some((s) => s === size || s.includes(size))) && (!color || p.colors.includes(color)) && PRICE[price](p.price));
    return SORT[sort] ? [...l].sort(SORT[sort]) : l;
  }, [base, size, color, price, sort]);

  const reset = () => { setSize(null); setColor(null); setPrice("all"); };
  const label = "font-sans text-[10.5px] font-normal uppercase tracking-[.2em] text-muted mr-1";

  return (
    <div className={isCouple ? "couple-scope bg-bg text-fg" : ""}>
      <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: meta.title }]} title={isCouple ? <>Univers <span className="ital">Couple</span></> : meta.title}>{meta.subtitle}</PageHead>
      <section className="wrap pb-28">
        <div className="mb-10 flex flex-wrap items-center gap-x-7 gap-y-3.5 border-y border-line py-[18px]">
          {!isCouple && (
            <div className="flex flex-wrap items-center gap-2"><span className={label}>Taille</span>
              {SIZES.map((s) => <button key={s} className={`chip ${size === s ? "on" : ""}`} onClick={() => setSize(size === s ? null : s)}>{s}</button>)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2"><span className={label}>Couleur</span>
            {colors.map((k) => <button key={k} className={`swatch ${color === k ? "on" : ""}`} style={{ background: COLORS[k].h }} title={COLORS[k].n} aria-label={COLORS[k].n} aria-pressed={color === k} onClick={() => setColor(color === k ? null : k)} />)}
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Prix" className="select" value={price} onChange={(e) => setPrice(e.target.value)}>
              <option value="all">Tous les prix</option><option value="lo">Moins de 25 000 FCFA</option><option value="mid">25 000 – 50 000 FCFA</option><option value="hi">Plus de 50 000 FCFA</option>
            </select>
            <select aria-label="Trier" className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="sel">Notre sélection</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option><option value="new">Nouveautés d’abord</option>
            </select>
          </div>
          <span className="ml-auto text-[13px] text-muted">{list.length} article{list.length > 1 ? "s" : ""}</span>
        </div>
        <ProductGrid>
          {list.length ? list.map((p) => <ProductCard key={p.id} product={p} />) : (
            <EmptyState title="Aucune pièce ne correspond" text="Essayez une autre taille ou une autre couleur.">
              <button className="btn btn-ghost" onClick={reset}>Effacer les filtres</button>
            </EmptyState>
          )}
        </ProductGrid>
        {isCouple && <div className="mt-20"><Perks /></div>}
      </section>
      {isCouple && !ageOk && <AgeGate />}
    </div>
  );
}
