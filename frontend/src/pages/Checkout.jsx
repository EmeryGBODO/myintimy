import { useState } from "react";
import { Link } from "react-router-dom";
import { CITIES, COLORS, formatPrice, getProduct, shippingFee } from "../data/catalog.js";
import ProductImage from "../components/ProductImage.jsx";
import { PageHead } from "../components/Shared.jsx";
import { useShop } from "../context/ShopContext.jsx";

const PAYMENTS = [
  ["MTN Mobile Money", "Vous recevrez une demande de validation sur votre téléphone."],
  ["Moov Money", "Validation par code sur votre téléphone."],
  ["Carte bancaire", "Visa, Mastercard. Paiement sur page sécurisée."],
  ["Paiement à la livraison", "En espèces ou Mobile Money, à réception du colis."],
];

function Field({ id, label, ...props }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} className="field" {...props} />
    </div>
  );
}

const Legend = ({ children }) => <legend className="mb-2.5 p-0 font-display text-[28px] font-light">{children}</legend>;

export default function Checkout() {
  const { cart, subtotal, clearCart } = useShop();
  const [f, setF] = useState({ name: "", phone: "", email: "", city: "Cotonou", area: "", address: "", neutral: true, pay: PAYMENTS[0][0] });
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  if (order) {
    return (
      <section className="wrap grid justify-items-center gap-5 py-20 text-center lg:py-36">
        <p className="eyebrow">Commande enregistrée</p>
        <h1 className="text-[clamp(40px,6vw,76px)]">Merci, <span className="ital">{order.first}</span></h1>
        <p className="border border-line-strong px-[18px] py-3 font-sans text-xs font-normal uppercase tracking-[.24em]">{order.ref}</p>
        <p className="max-w-[52ch] text-muted">Votre commande sera préparée avec soin et expédiée sous emballage neutre. Mode de paiement choisi : {order.pay}. Une conseillère vous contactera par téléphone pour confirmer la livraison.</p>
        <p className="text-[13px] text-muted">Boutique de démonstration : aucun paiement n’a été effectué.</p>
        <Link to="/" className="btn btn-ghost">Retour à l’accueil</Link>
      </section>
    );
  }

  if (!cart.length) {
    return (
      <section className="wrap grid justify-items-center gap-5 py-28 text-center">
        <h1 className="text-[clamp(40px,6vw,76px)]">Votre panier est vide</h1>
        <p className="text-muted">Ajoutez une pièce pour passer commande.</p>
        <Link to="/categorie/nouveautes" className="btn">Voir les nouveautés</Link>
      </section>
    );
  }

  const fee = shippingFee(f.city, subtotal);
  const total = subtotal + fee;
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim() || !f.area.trim() || !f.address.trim()) {
      return setError("Merci de compléter votre nom, téléphone, quartier et adresse.");
    }
    setOrder({ ref: "MYI-" + Math.random().toString(36).slice(2, 8).toUpperCase(), first: f.name.trim().split(" ")[0], pay: f.pay });
    clearCart();
    window.scrollTo(0, 0);
  };

  return (
    <>
      <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Commande" }]} title={<>Finaliser la <span className="ital">commande</span></>} />
      <section className="wrap grid items-start gap-10 pb-24 pt-6 md:grid-cols-[1.3fr_1fr] lg:gap-20">
        <form onSubmit={submit} noValidate className="grid gap-[30px]">
          <fieldset className="m-0 grid gap-4 border-0 p-0">
            <Legend>Vos coordonnées</Legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Prénom et nom" autoComplete="name" value={f.name} onChange={set("name")} />
              <Field id="phone" label="Téléphone" type="tel" placeholder="+229" autoComplete="tel" value={f.phone} onChange={set("phone")} />
            </div>
            <Field id="email" label="E-mail (facultatif)" type="email" autoComplete="email" value={f.email} onChange={set("email")} />
          </fieldset>

          <fieldset className="m-0 grid gap-4 border-0 p-0">
            <Legend>Livraison</Legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="city" className="field-label">Ville</label>
                <select id="city" className="field" value={f.city} onChange={set("city")}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              <Field id="area" label="Quartier" value={f.area} onChange={set("area")} />
            </div>
            <Field id="address" label="Adresse ou point de repère" value={f.address} onChange={set("address")} />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={f.neutral} onChange={set("neutral")} className="mt-1 accent-accent" />
              <span>Emballage neutre, sans logo ni description du contenu</span>
            </label>
          </fieldset>

          <fieldset className="m-0 grid gap-2.5 border-0 p-0">
            <Legend>Paiement</Legend>
            {PAYMENTS.map(([name, hint]) => (
              <label key={name} className={`flex cursor-pointer items-center gap-3.5 border px-[18px] py-4 transition-colors ${f.pay === name ? "border-fg" : "border-line"}`}>
                <input type="radio" name="pay" value={name} checked={f.pay === name} onChange={set("pay")} className="accent-accent" />
                <span>{name}<small className="block text-[12.5px] text-muted">{hint}</small></span>
              </label>
            ))}
          </fieldset>

          <p className="min-h-[1.2em] font-display text-base italic text-accent">{error}</p>
          <button type="submit" className="btn w-full">Confirmer · {formatPrice(total)}</button>
        </form>

        <aside className="-order-1 grid gap-4 bg-surface p-6 md:sticky md:top-24 md:order-none lg:p-9">
          <h2 className="text-[28px]">Récapitulatif</h2>
          {cart.map((i) => {
            const p = getProduct(i.id);
            return (
              <div key={i.key} className="grid grid-cols-[56px_1fr_auto] gap-4 border-b border-line pb-4">
                <div className="aspect-[3/4] overflow-hidden"><ProductImage product={p} color={i.color} /></div>
                <div><h3 className="text-base font-normal leading-tight">{p.name}</h3><p className="text-[12.5px] text-muted">{COLORS[i.color].n}{i.size ? ` · ${i.size}` : ""} · ×{i.qty}</p></div>
                <span className="text-[13px] tabular-nums">{formatPrice(p.price * i.qty)}</span>
              </div>
            );
          })}
          <div className="flex justify-between text-muted tabular-nums"><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between text-muted tabular-nums"><span>Livraison ({f.city})</span><span>{fee ? formatPrice(fee) : "Offerte"}</span></div>
          <div className="flex justify-between border-t border-line pt-3.5 tabular-nums"><span>Total</span><b className="text-lg font-normal">{formatPrice(total)}</b></div>
        </aside>
      </section>
    </>
  );
}
