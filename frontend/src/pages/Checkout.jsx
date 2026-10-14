import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CITIES, formatPrice, shippingFee } from "../data/catalog.js";
import ProductImage from "../components/ProductImage.jsx";
import { PageHead } from "../components/Shared.jsx";
import { useCatalog } from "../catalog/catalog-context.js";
import { getCartItemUnitPrice } from "../domain/cart.js";
import { ordersApi } from "../api/orders.js";
import { useShop } from "../context/shop-context.js";
import { useClient } from "../account/client-context.js";
import { customerApi } from "../api/customer.js";

const PAYMENTS = [
  ["cash_on_delivery", "Paiement à la livraison", "Le règlement est effectué à la réception du colis."],
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

function cartVariant(product, item) {
  return (product?.variants || []).find((variant) => {
    const color = variant.color?.slug || variant.color_slug;
    const size = variant.size?.code || variant.size_code || null;
    return color === item.color && size === (item.size || null);
  });
}

function colorLabel(product, slug) {
  return product?.colorDetails?.find((color) => color.slug === slug)?.name || slug;
}

export default function Checkout() {
  const { cart, subtotal, clearCart } = useShop();
  const { customer } = useClient();
  const { getProduct, source } = useCatalog();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "Cotonou",
    area: "",
    address: "",
    neutral: true,
    pay: "cash_on_delivery",
  });
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (!customer) return undefined;
    setForm((current) => ({ ...current, name: current.name || customer.full_name || "", phone: current.phone || customer.phone || "", email: current.email || customer.email || "" }));
    customerApi.addresses.list().then((items) => {
      setAddresses(items);
      const preferred = items.find((item) => item.is_default);
      if (preferred) setForm((current) => ({ ...current, name: current.name || preferred.recipient_name, phone: current.phone || preferred.phone, city: preferred.city, area: preferred.area, address: preferred.address }));
    }).catch(() => {});
    return undefined;
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (event) => setForm((current) => ({
    ...current,
    [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value,
  }));

  const rows = useMemo(() => cart.map((item) => {
    const product = getProduct(item.id);
    return {
      item,
      product,
      variant: cartVariant(product, item),
      unitPrice: getCartItemUnitPrice(product, item),
    };
  }), [cart, getProduct]);

  if (order) {
    return (
      <section className="wrap grid justify-items-center gap-5 py-20 text-center lg:py-36">
        <p className="eyebrow">Commande enregistrée</p>
        <h1 className="text-[clamp(40px,6vw,76px)]">Merci, <span className="ital">{order.customer_name.split(" ")[0]}</span></h1>
        <p className="border border-line-strong px-[18px] py-3 font-sans text-xs font-normal uppercase tracking-[.24em]">{order.reference}</p>
        <p className="max-w-[52ch] text-muted">
          Votre commande est confirmée et le stock correspondant a été réservé. Le règlement sera effectué à la livraison.
        </p>
        <p className="text-sm text-muted">Total confirmé : {formatPrice(order.total_xof)}</p>
        {customer ? <Link to={`/compte/commandes/${order.reference}`} className="btn btn-ghost">Voir ma commande</Link> : <Link to="/" className="btn btn-ghost">Retour à l’accueil</Link>}
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

  const fee = shippingFee(form.city, subtotal);
  const total = subtotal + fee;

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.area.trim() || !form.address.trim()) {
      setError("Merci de compléter votre nom, téléphone, quartier et adresse.");
      return;
    }
    if (source !== "api") {
      setError("Le service de commande est momentanément indisponible. Réessayez lorsque la boutique est reconnectée.");
      return;
    }
    const unavailable = rows.find((row) => !row.product || !row.variant?.id);
    if (unavailable) {
      setError("Un article du panier n'est plus disponible. Retirez-le ou rechargez la boutique avant de continuer.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await ordersApi.create({
        customer_name: form.name.trim(),
        customer_phone: form.phone.trim(),
        customer_email: form.email.trim() || null,
        city: form.city,
        area: form.area.trim(),
        address: form.address.trim(),
        neutral_packaging: form.neutral,
        payment_method: form.pay,
        items: rows.map(({ item, variant }) => ({ variant_id: variant.id, quantity: item.qty })),
      });
      setOrder(created);
      clearCart();
      window.scrollTo(0, 0);
    } catch (err) {
      if (err?.code === "INSUFFICIENT_STOCK" || err?.code === "VARIANT_UNAVAILABLE") {
        setError("Le stock a changé depuis l'ajout au panier. Rechargez la page et vérifiez les quantités disponibles.");
      } else {
        setError(err?.message || "Impossible d'enregistrer la commande pour le moment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Commande" }]} title={<>Finaliser la <span className="ital">commande</span></>} />
      <section className="wrap grid items-start gap-10 pb-24 pt-6 md:grid-cols-[1.3fr_1fr] lg:gap-20">
        <form onSubmit={submit} noValidate className="grid gap-[30px]">
          <fieldset className="m-0 grid gap-4 border-0 p-0">
            <Legend>Vos coordonnées</Legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Prénom et nom" autoComplete="name" value={form.name} onChange={set("name")} />
              <Field id="phone" label="Téléphone" type="tel" placeholder="+229" autoComplete="tel" value={form.phone} onChange={set("phone")} />
            </div>
            <Field id="email" label="E-mail (facultatif)" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
          </fieldset>

          <fieldset className="m-0 grid gap-4 border-0 p-0">
            <Legend>Livraison</Legend>
            {addresses.length > 0 && <div className="grid gap-1.5"><label htmlFor="saved-address" className="field-label">Adresse enregistrée</label><select id="saved-address" className="field" defaultValue="" onChange={(event) => { const selected=addresses.find((item)=>item.id===event.target.value); if(selected)setForm((current)=>({...current,name:selected.recipient_name,phone:selected.phone,city:selected.city,area:selected.area,address:selected.address})); }}><option value="">Saisie manuelle</option>{addresses.map((item)=><option key={item.id} value={item.id}>{item.label} · {item.area}, {item.city}</option>)}</select></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="city" className="field-label">Ville</label>
                <select id="city" className="field" value={form.city} onChange={set("city")}>{CITIES.map((city) => <option key={city}>{city}</option>)}</select>
              </div>
              <Field id="area" label="Quartier" value={form.area} onChange={set("area")} />
            </div>
            <Field id="address" label="Adresse ou point de repère" value={form.address} onChange={set("address")} />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={form.neutral} onChange={set("neutral")} className="mt-1 accent-accent" />
              <span>Emballage neutre, sans logo ni description du contenu</span>
            </label>
          </fieldset>

          <fieldset className="m-0 grid gap-2.5 border-0 p-0">
            <Legend>Paiement</Legend>
            {PAYMENTS.map(([value, name, hint]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-3.5 border px-[18px] py-4 transition-colors ${form.pay === value ? "border-fg" : "border-line"}`}>
                <input type="radio" name="pay" value={value} checked={form.pay === value} onChange={set("pay")} className="accent-accent" />
                <span>{name}<small className="block text-[12.5px] text-muted">{hint}</small></span>
              </label>
            ))}
            <p className="text-xs text-muted">Les moyens Mobile Money et carte seront affichés uniquement lorsqu’ils seront réellement intégrés.</p>
          </fieldset>

          <p className="min-h-[1.2em] font-display text-base italic text-accent" role="alert">{error}</p>
          <button type="submit" className="btn w-full" disabled={submitting}>
            {submitting ? "Enregistrement…" : `Confirmer · ${formatPrice(total)}`}
          </button>
        </form>

        <aside className="-order-1 grid gap-4 bg-surface p-6 md:sticky md:top-24 md:order-none lg:p-9">
          <h2 className="text-[28px]">Récapitulatif</h2>
          {rows.map(({ item, product, unitPrice }) => (
            <div key={item.key} className="grid grid-cols-[56px_1fr_auto] gap-4 border-b border-line pb-4">
              <div className="aspect-[3/4] overflow-hidden"><ProductImage product={product} color={item.color} /></div>
              <div>
                <h3 className="text-base font-normal leading-tight">{product?.name || "Produit indisponible"}</h3>
                <p className="text-[12.5px] text-muted">{colorLabel(product, item.color)}{item.size ? ` · ${item.size}` : ""} · ×{item.qty}</p>
              </div>
              <span className="text-[13px] tabular-nums">{formatPrice(unitPrice * item.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between text-muted tabular-nums"><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between text-muted tabular-nums"><span>Livraison ({form.city})</span><span>{fee ? formatPrice(fee) : "Offerte"}</span></div>
          <div className="flex justify-between border-t border-line pt-3.5 tabular-nums"><span>Total estimé</span><b className="text-lg font-normal">{formatPrice(total)}</b></div>
          <p className="text-[11px] leading-relaxed text-muted">Le montant final est recalculé et validé par le serveur au moment de la commande.</p>
        </aside>
      </section>
    </>
  );
}
