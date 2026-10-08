import { Link } from "react-router-dom";
import { useShop } from "../context/shop-context.js";
import { COLORS, formatPrice } from "../data/catalog.js";
import ProductImage from "./ProductImage.jsx";
import { IconBox, IconChat, IconHeart, IconLock, IconReturn } from "./Icons.jsx";

export function FavButton({ id, className = "" }) {
  const { isFav, toggleFav } = useShop();
  const on = isFav(id);
  return (
    <button onClick={(e) => { e.preventDefault(); toggleFav(id); }} aria-pressed={on} aria-label={on ? "Retirer des favoris" : "Ajouter aux favoris"} className={className}>
      <IconHeart className={`h-[17px] w-[17px] ${on ? "fill-accent stroke-accent" : ""}`} />
    </button>
  );
}

export function ProductCard({ product: p }) {
  return (
    <article className="group relative min-w-0">
      <Link to={`/produit/${p.id}`} aria-label={p.name}>
        <figure className="relative m-0 aspect-[3/4] overflow-hidden bg-surface">
          <ProductImage product={p} color={p.colors[0]} className="transition-transform duration-1000 ease-lux group-hover:scale-[1.04]" />
          <div className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-lux group-hover:opacity-100">
            <ProductImage product={p} color={p.colors[1] || p.colors[0]} variant={1} />
          </div>
          {p.tag && <span className="absolute left-3 top-3 bg-bg px-2.5 py-[7px] font-sans text-[9.5px] font-normal uppercase leading-none tracking-[.2em] text-fg">{p.tag}</span>}
        </figure>
        <div className="grid gap-1 pt-4">
          <h3 className="text-[19px] font-normal leading-snug">{p.name}</h3>
          <p className="text-[13.5px] tracking-wide tabular-nums">{formatPrice(p.price)}</p>
          <div className="mt-1.5 flex gap-1.5">
            {p.colors.map((k) => <i key={k} title={COLORS[k].n} className="h-[11px] w-[11px] rounded-full border border-line-strong" style={{ background: COLORS[k].h }} />)}
          </div>
        </div>
      </Link>
      <FavButton id={p.id} className="absolute right-2 top-2 z-[2] grid h-[38px] w-[38px] place-items-center rounded-full bg-glass transition-transform hover:scale-110" />
    </article>
  );
}

export const ProductGrid = ({ children }) => (
  <div className="grid grid-cols-2 gap-x-3.5 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] sm:gap-x-6 sm:gap-y-12">{children}</div>
);

const PERKS = [
  { Icon: IconBox, t: "Livraison discrète", d: "Colis neutre, sans logo ni mention du contenu. 24 à 72 h au Bénin." },
  { Icon: IconLock, t: "Paiement sécurisé", d: "MTN MoMo, Moov Money, carte bancaire ou paiement à la livraison." },
  { Icon: IconReturn, t: "Retours 14 jours", d: "Pour la lingerie non portée, étiquettes et protège-hygiène intacts." },
  { Icon: IconChat, t: "Conseil privé", d: "Une conseillère vous répond sur WhatsApp, en toute confidentialité." },
];
export function Perks() {
  return (
    <div className="grid border-y border-line sm:grid-cols-2 lg:grid-cols-4">
      {PERKS.map(({ Icon, t, d }, i) => (
        <div key={t} className={`grid content-start gap-2.5 px-3 py-8 lg:px-7 ${i > 0 ? "border-t border-line sm:border-t-0" : ""} ${i % 2 ? "sm:border-l" : ""} ${i >= 2 ? "sm:border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""} border-line`}>
          <Icon className="h-[26px] w-[26px] text-accent" />
          <b className="font-display text-xl font-normal leading-tight">{t}</b>
          <span className="text-sm text-muted">{d}</span>
        </div>
      ))}
    </div>
  );
}

export function Crumbs({ items }) {
  return (
    <p className="font-sans text-[11px] font-normal uppercase tracking-[.16em] text-muted">
      {items.map((it, i) => (
        <span key={i}>{i > 0 && " / "}{it.to ? <Link to={it.to} className="hover:text-fg">{it.label}</Link> : it.label}</span>
      ))}
    </p>
  );
}

export function PageHead({ crumbs, title, children }) {
  return (
    <section className="wrap grid gap-3.5 pb-7 pt-10 sm:pt-16 lg:pt-20">
      <Crumbs items={crumbs} />
      <h1 className="text-[clamp(46px,6.5vw,92px)] leading-none">{title}</h1>
      {children && <p className="max-w-[56ch] text-[17px] text-muted">{children}</p>}
    </section>
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="col-span-full grid justify-items-center gap-[18px] py-16 text-center text-muted">
      <h3 className="text-[30px] text-fg">{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
