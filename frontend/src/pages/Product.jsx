import { useState } from "react";
import { CATEGORIES, COLORS, PRODUCTS, formatPrice, getProduct } from "../data/catalog.js";
import ProductImage from "../components/ProductImage.jsx";
import { Crumbs, FavButton, ProductCard, ProductGrid } from "../components/Shared.jsx";
import { AgeGate, Qty } from "../components/Overlays.jsx";
import { IconBox } from "../components/Icons.jsx";
import { useShop } from "../context/shop-context.js";
import NotFound from "./NotFound.jsx";

const optLabel = "mb-3 flex items-baseline justify-between font-sans text-[10.5px] font-normal uppercase tracking-[.2em]";

function Accordion({ title, children, open }) {
  return (
    <details open={open} className="group border-t border-line last:border-b">
      <summary className="flex cursor-pointer list-none justify-between py-[18px] font-sans text-[11px] font-normal uppercase tracking-[.2em] [&::-webkit-details-marker]:hidden">
        {title}<span className="text-xl font-light leading-none transition-transform duration-300 group-open:rotate-45">+</span>
      </summary>
      <div className="pb-5 text-[14.5px] text-muted">{children}</div>
    </details>
  );
}

export default function Product({ id }) {
  const p = getProduct(id);
  const { addToCart, openPanel, ageOk } = useShop();
  const [color, setColor] = useState(p?.colors[0]);
  const [size, setSize] = useState(p?.sizes?.length === 1 ? p.sizes[0] : null);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const [error, setError] = useState("");
  if (!p) return <NotFound />;

  const isCouple = p.category === "couple";
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const add = () => {
    if (p.sizes && !size) return setError("Choisissez une taille pour continuer.");
    addToCart(p.id, color, size, qty);
  };

  return (
    <div className={isCouple ? "couple-scope bg-bg text-fg" : ""}>
      <section className="wrap pt-7">
        <Crumbs items={[{ to: "/", label: "Accueil" }, { to: `/categorie/${p.category}`, label: CATEGORIES[p.category].title }, { label: p.name }]} />
      </section>
      <section className="wrap grid items-start gap-8 pb-10 pt-8 md:grid-cols-[1.15fr_1fr] md:gap-12 lg:gap-20">
        {/* Galerie */}
        <div className="grid gap-3.5 md:sticky md:top-24 md:grid-cols-[76px_1fr]">
          <div className="order-2 grid grid-cols-[repeat(3,64px)] content-start gap-2.5 md:order-none md:grid-cols-1">
            {[0, 1, 2].map((v) => (
              <button key={v} onClick={() => setView(v)} aria-label={`Vue ${v + 1}`}
                className={`aspect-[3/4] overflow-hidden border transition ${view === v ? "border-fg opacity-100" : "border-transparent opacity-60 hover:opacity-100"}`}>
                <ProductImage product={p} color={color} variant={v} />
              </button>
            ))}
          </div>
          <div className="aspect-[3/4] overflow-hidden bg-surface">
            <ProductImage key={color + view} product={p} color={color} variant={view} className="animate-fadein" />
          </div>
        </div>

        {/* Informations */}
        <div className="grid min-w-0 gap-[26px]">
          <div className="grid gap-3">
            {p.tag && <p className="eyebrow">{p.tag}</p>}
            <h1 className="text-[clamp(36px,4vw,54px)] leading-[1.05]">{p.name}</h1>
            <p className="text-[17px] tracking-wide tabular-nums">{formatPrice(p.price)}</p>
          </div>
          <p className="max-w-[52ch] text-muted">{p.description}</p>

          <div>
            <div className={optLabel}><span>Couleur</span><em className="font-display text-base normal-case italic tracking-normal text-muted">{COLORS[color].n}</em></div>
            <div className="flex gap-3">
              {p.colors.map((k) => <button key={k} onClick={() => setColor(k)} aria-label={COLORS[k].n} aria-pressed={color === k} className={`swatch !h-[30px] !w-[30px] ${color === k ? "on" : ""}`} style={{ background: COLORS[k].h }} />)}
            </div>
          </div>

          {p.sizes && (
            <div>
              <div className={optLabel}><span>Taille</span>
                <button onClick={() => openPanel("sizes")} className="font-sans text-[11px] normal-case tracking-wide text-muted underline underline-offset-4">Guide des tailles</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.sizes.map((s) => <button key={s} onClick={() => { setSize(s); setError(""); }} className={`chip !h-11 !min-w-[52px] ${size === s ? "on" : ""}`}>{s}</button>)}
              </div>
              <p className="mt-2 min-h-[1.2em] font-display text-base italic text-accent">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-[auto_1fr_auto] gap-2.5">
            <Qty value={qty} onMinus={() => setQty(Math.max(1, qty - 1))} onPlus={() => setQty(Math.min(9, qty + 1))} />
            <button onClick={add} className="btn">Ajouter au panier</button>
            <FavButton id={p.id} className="grid w-[54px] place-items-center border border-line-strong" />
          </div>

          <div className="flex items-start gap-3.5 bg-soft px-[18px] py-4 text-[13.5px] text-muted">
            <IconBox className="h-5 w-5 flex-none text-accent" />
            <span>{isCouple ? "Expédié dans un colis neutre et opaque, sans logo ni mention du contenu. Le libellé bancaire reste discret." : "Livraison offerte dès 50 000 FCFA, sous emballage neutre. Livré dans sa pochette en satin."}</span>
          </div>

          <div>
            <Accordion title="Description" open>{p.description}</Accordion>
            <Accordion title="Matières & entretien">{p.material}</Accordion>
            <Accordion title="Livraison & retours">
              <ul className="list-disc pl-[18px]">
                <li>Cotonou : 24 h, 1 500 FCFA.</li>
                <li>Autres villes du Bénin : 48 à 72 h, 3 000 FCFA.</li>
                <li>Offerte dès 50 000 FCFA d’achat.</li>
                <li>{isCouple ? "Pour des raisons d’hygiène, les articles intimes ouverts ne sont ni repris ni échangés." : "Retours sous 14 jours pour les pièces non portées."}</li>
              </ul>
            </Accordion>
          </div>
        </div>
      </section>

      <section className="wrap py-16 lg:py-28">
        <p className="eyebrow">À associer</p>
        <h2 className="mb-10 mt-3 text-[clamp(34px,4.4vw,56px)]">Vous aimerez aussi</h2>
        <ProductGrid>{related.map((r) => <ProductCard key={r.id} product={r} />)}</ProductGrid>
      </section>
      {isCouple && !ageOk && <AgeGate />}
    </div>
  );
}
