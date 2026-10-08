import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/shop-context.js";
import { CATEGORIES, COLORS, FREE_SHIPPING, PRODUCTS, formatPrice, getProduct } from "../data/catalog.js";
import ProductImage from "./ProductImage.jsx";
import { NAV } from "../data/navigation.js";
import { ThemeButton } from "./Header.jsx";
import { IconClose, IconMinus, IconPlus } from "./Icons.jsx";

const CloseBtn = ({ onClick, label = "Fermer", className = "" }) => (
  <button onClick={onClick} className={`icon-btn ${className}`} aria-label={label}><IconClose /></button>
);

export function Qty({ value, onMinus, onPlus, className = "" }) {
  return (
    <div className={`flex items-stretch border border-line-strong ${className}`}>
      <button onClick={onMinus} className="grid w-10 place-items-center" aria-label="Moins"><IconMinus className="h-3.5 w-3.5" /></button>
      <span className="grid w-7 place-items-center tabular-nums">{value}</span>
      <button onClick={onPlus} className="grid w-10 place-items-center" aria-label="Plus"><IconPlus className="h-3.5 w-3.5" /></button>
    </div>
  );
}

/* ---------- Panier latéral ---------- */
export function CartDrawer() {
  const { panel, closePanel, cart, subtotal, changeQty, removeItem } = useShop();
  const open = panel === "cart";
  const left = FREE_SHIPPING - subtotal;
  return (
    <>
      <div onClick={closePanel} className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-500 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside aria-label="Panier" aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[70] grid w-full max-w-[440px] grid-rows-[auto_1fr_auto] border-l border-line bg-bg pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] transition-transform duration-500 ease-lux ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-[28px]">Votre panier</h2>
          <CloseBtn onClick={closePanel} />
        </div>
        <div className="overflow-y-auto px-6 py-2">
          {cart.length === 0 ? (
            <div className="grid justify-items-center gap-4 py-16 text-center text-muted">
              <h3 className="text-[30px] text-fg">Votre panier est vide</h3>
              <p>Laissez-vous tenter par nos nouveautés.</p>
              <Link to="/categorie/nouveautes" onClick={closePanel} className="btn btn-ghost">Découvrir</Link>
            </div>
          ) : cart.map((i) => {
            const p = getProduct(i.id);
            return (
              <div key={i.key} className="grid grid-cols-[84px_1fr] gap-4 border-b border-line py-[18px]">
                <div className="aspect-[3/4] overflow-hidden"><ProductImage product={p} color={i.color} /></div>
                <div>
                  <h3 className="text-lg leading-tight">{p.name}</h3>
                  <p className="mt-0.5 text-[12.5px] text-muted">{COLORS[i.color].n}{i.size ? ` · Taille ${i.size}` : ""}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Qty className="h-[34px]" value={i.qty} onMinus={() => changeQty(i.key, -1)} onPlus={() => changeQty(i.key, 1)} />
                    <span className="text-[13.5px] tracking-wide tabular-nums">{formatPrice(p.price * i.qty)}</span>
                  </div>
                  <button onClick={() => removeItem(i.key)} className="mt-2.5 text-[11.5px] text-muted underline underline-offset-[3px]">Retirer</button>
                </div>
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div className="grid gap-3.5 border-t border-line px-6 py-5">
            <div className="grid gap-2 text-[13px] text-muted">
              <span>{left > 0 ? <>Plus que <b className="font-medium text-fg">{formatPrice(left)}</b> pour la livraison offerte</> : "La livraison vous est offerte"}</span>
              <div className="h-0.5 bg-line"><i className="block h-full bg-accent transition-[width] duration-700 ease-lux" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }} /></div>
            </div>
            <div className="flex justify-between tabular-nums"><span>Sous-total</span><b className="text-lg font-normal">{formatPrice(subtotal)}</b></div>
            <Link to="/commande" onClick={closePanel} className="btn w-full">Commander</Link>
            <p className="text-center text-xs text-muted">Colis neutre · Paiement sécurisé</p>
          </div>
        )}
      </aside>
    </>
  );
}

/* ---------- Menu mobile ---------- */
export function MobileMenu() {
  const { panel, closePanel } = useShop();
  const open = panel === "menu";
  const links = [...NAV, { to: "/favoris", label: "Favoris" }];
  return (
    <div className={`fixed inset-0 z-[80] flex flex-col bg-bg px-6 pb-8 pt-[calc(env(safe-area-inset-top,0px)+16px)] transition-opacity duration-500 ease-lux ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="flex items-center justify-between">
        <span className="font-display text-xl uppercase tracking-[.32em]">Myintimy</span>
        <CloseBtn onClick={closePanel} label="Fermer le menu" />
      </div>
      <nav className="mt-12 grid gap-1.5">
        {links.map((l, i) => (
          <Link key={l.to} to={l.to} onClick={closePanel} style={{ transitionDelay: open ? `${i * 50}ms` : "0ms" }}
            className={`font-display text-[clamp(34px,9vw,48px)] font-light leading-tight transition-all duration-700 ease-lux ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${l.couple ? "italic text-accent" : ""}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex items-center justify-between text-[13px] text-muted">
        <span>Livraison discrète partout au Bénin</span>
        <ThemeButton />
      </div>
    </div>
  );
}

/* ---------- Modale générique ---------- */
function Modal({ children, onClose, className = "", align = "center" }) {
  return (
    <div className={`fixed inset-0 z-[90] grid justify-items-center p-4 ${align === "top" ? "items-start pt-[8vh]" : "items-center"}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative max-h-[calc(100vh-32px)] w-full overflow-auto border border-line bg-bg p-7 animate-rise sm:p-12 ${className}`}>{children}</div>
    </div>
  );
}

/* ---------- Recherche ---------- */
export function SearchModal() {
  const { panel, closePanel, ageOk } = useShop();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return PRODUCTS.filter((p) => (p.category !== "couple" || ageOk) && `${p.name} ${p.description} ${CATEGORIES[p.category].title}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q, ageOk]);
  if (panel !== "search") return null;
  return (
    <Modal onClose={closePanel} align="top" className="max-w-[720px]">
      <CloseBtn onClick={closePanel} className="absolute right-3 top-3" />
      <p className="eyebrow">Rechercher</p>
      <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dentelle, soie, nuisette…" aria-label="Rechercher un article"
        className="w-full border-0 border-b border-line-strong bg-transparent px-0.5 py-3.5 font-display text-[30px] font-light outline-none" />
      <div className="mt-4 flex flex-wrap gap-2">
        {["Dentelle", "Soie", "Nuisette", "Satin", "Velours"].map((s) => <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>)}
      </div>
      <div className="mt-4 grid gap-1">
        {q.trim() && !results.length && <p className="py-3 text-muted">Aucun résultat pour « {q} ».</p>}
        {results.map((p) => (
          <Link key={p.id} to={`/produit/${p.id}`} onClick={closePanel} className="grid grid-cols-[48px_1fr_auto] items-center gap-4 p-2 transition-colors hover:bg-surface">
            <div className="aspect-[3/4] overflow-hidden"><ProductImage product={p} color={p.colors[0]} /></div>
            <b className="font-display text-lg font-normal">{p.name}</b>
            <span className="text-[13px] tabular-nums">{formatPrice(p.price)}</span>
          </Link>
        ))}
      </div>
    </Modal>
  );
}

/* ---------- Guide des tailles ---------- */
const SIZE_ROWS = [["XS", "78–82", "60–64", "86–90", "80A – 80B"], ["S", "83–87", "65–69", "91–95", "85B – 85C"], ["M", "88–92", "70–74", "96–100", "90B – 90C"], ["L", "93–97", "75–79", "101–105", "95C – 95D"], ["XL", "98–102", "80–84", "106–110", "100C – 100D"]];
export function SizeGuide() {
  const { panel, closePanel } = useShop();
  if (panel !== "sizes") return null;
  return (
    <Modal onClose={closePanel} className="max-w-[560px]">
      <CloseBtn onClick={closePanel} className="absolute right-3 top-3" />
      <p className="eyebrow">Mesures en centimètres</p>
      <h2 className="mt-2.5 text-4xl">Guide des tailles</h2>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px] tabular-nums">
          <thead><tr>{["Taille", "Poitrine", "Taille", "Hanches", "Bonnet"].map((h, i) => <th key={i} className="whitespace-nowrap border-b border-line px-2.5 py-3 text-left font-sans text-[10.5px] font-normal uppercase tracking-[.16em] text-muted">{h}</th>)}</tr></thead>
          <tbody>{SIZE_ROWS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className="whitespace-nowrap border-b border-line px-2.5 py-3">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-5 text-sm text-muted">Entre deux tailles, choisissez la plus grande pour la lingerie en dentelle, la plus petite pour la soie.</p>
    </Modal>
  );
}

/* ---------- Vérification d'âge ---------- */
export function AgeGate() {
  const { confirmAge } = useShop();
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4">
      <div className="absolute inset-0 bg-[#140812]/80 backdrop-blur-xl" />
      <div role="dialog" aria-modal="true" aria-labelledby="gateT" className="relative grid w-full max-w-[560px] justify-items-center gap-[18px] border border-plum-fg/15 bg-plum p-8 text-center text-plum-fg animate-rise sm:p-12">
        <div className="grid h-[74px] w-[74px] place-items-center rounded-full border border-plum-fg/20 font-display text-[26px]">18+</div>
        <p className="eyebrow !text-plum-muted">Univers Couple</p>
        <h2 id="gateT" className="text-[clamp(32px,5vw,44px)] leading-tight">Un espace réservé aux adultes</h2>
        <p className="max-w-[40ch] text-plum-muted">Cette section présente des articles pour le bien-être intime. Confirmez que vous avez 18 ans ou plus pour y accéder.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button autoFocus onClick={confirmAge} className="btn !border-rose !bg-rose !text-[#1A0F17] hover:!bg-transparent hover:!text-plum-fg">J’ai 18 ans ou plus</button>
          <button onClick={() => navigate("/")} className="btn !border-plum-fg/20 !bg-transparent !text-plum-fg hover:!border-plum-fg">Je n’ai pas 18 ans</button>
        </div>
        <small className="text-xs text-plum-muted">Votre choix est mémorisé le temps de votre visite.</small>
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
export function Toast() {
  const { toastMsg } = useShop();
  return (
    <div role="status" aria-live="polite"
      className={`pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-[100] -translate-x-1/2 bg-fg px-5 py-3.5 text-[13px] tracking-wide text-bg transition-all duration-500 ease-lux ${toastMsg ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
      {toastMsg}
    </div>
  );
}
