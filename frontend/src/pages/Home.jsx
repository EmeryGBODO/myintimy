import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS, getProduct } from "../data/catalog.js";
import ProductImage from "../components/ProductImage.jsx";
import { Perks, ProductCard } from "../components/Shared.jsx";
import { IconArrow, IconLeft, IconRight } from "../components/Icons.jsx";

const count = (cat) => PRODUCTS.filter((p) => p.category === cat).length;
const COLLECTIONS = [
  { to: "lingerie", label: "Lingerie", art: [1, "prune", 0], meta: `${count("lingerie")} pièces` },
  { to: "vetements", label: "Vêtements", art: [9, "champagne", 0], meta: `${count("vetements")} pièces` },
  { to: "nuit", label: "Nuit & Détente", art: [16, "noir", 0], meta: `${count("nuit")} pièces` },
  { to: "couple", label: "Univers Couple", art: [20, "prune", 2], meta: "18+" },
];

const Art = ({ id, color, v = 0, className = "" }) => <ProductImage product={getProduct(id)} color={color} variant={v} className={className} />;

function SectionHead({ eyebrow, children, aside }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6 lg:mb-12">
      <div><p className="eyebrow">{eyebrow}</p><h2 className="mt-3 text-[clamp(34px,4.4vw,56px)] leading-[1.05]">{children}</h2></div>
      {aside}
    </div>
  );
}

export default function Home() {
  const rail = useRef(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const scroll = (dir) => rail.current?.scrollBy({ left: rail.current.clientWidth * 0.8 * dir, behavior: "smooth" });
  const newArrivals = PRODUCTS.filter((p) => p.isNew && p.category !== "couple");

  return (
    <>
      {/* Héro */}
      <section className="wrap grid items-center gap-8 pb-16 pt-10 md:grid-cols-[1.05fr_1fr] md:gap-12 lg:gap-20 lg:pb-28 lg:pt-20">
        <div className="animate-rise">
          <p className="eyebrow">Collection Nocturne · Automne 2026</p>
          <h1 className="my-6 text-[clamp(48px,7.4vw,108px)] leading-[.98] tracking-[-.01em]">L’art d’être <em className="text-accent">soi</em>, en toute intimité.</h1>
          <p className="max-w-[44ch] text-[17px] text-muted">Lingerie de luxe, vêtements fluides et objets de complicité. Des matières nobles, des coupes précises, livrées partout au Bénin dans un écrin discret.</p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <Link to="/categorie/lingerie" className="btn">Découvrir la lingerie <IconArrow className="h-4 w-4" /></Link>
            <Link to="/categorie/nouveautes" className="btn btn-ghost">Nouveautés</Link>
          </div>
        </div>
        <div className="relative max-w-[520px] pb-12 animate-rise [animation-delay:.12s] md:max-w-none">
          <div className="pointer-events-none absolute -right-[18px] -top-[18px] aspect-[3/4] w-[80%] border border-line-strong" />
          <div className="relative ml-auto aspect-[3/4] w-[80%] overflow-hidden"><Art id={14} color="rose" className="animate-drift" /></div>
          <div className="absolute bottom-0 left-0 aspect-[3/4] w-[44%] overflow-hidden outline outline-[10px] outline-bg"><Art id={1} color="noir" v={1} /></div>
          <span className="absolute bottom-1 right-0 font-display text-[15px] italic text-muted">Nuisette Clair de lune</span>
        </div>
      </section>

      {/* Collections */}
      <section className="wrap pb-16 lg:pb-28">
        <SectionHead eyebrow="Les collections">Quatre univers, une même <span className="ital">délicatesse</span></SectionHead>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {COLLECTIONS.map((c) => (
            <Link key={c.to} to={`/categorie/${c.to}`} className="group relative block aspect-[3/4.3] overflow-hidden bg-surface">
              <Art id={c.art[0]} color={c.art[1]} v={c.art[2]} className="transition-transform duration-[1200ms] ease-lux group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#10080e]/60 to-transparent p-4 text-[#FAF7F5] sm:p-[22px]">
                <b className="font-display text-[clamp(20px,2.2vw,30px)] font-light leading-none">{c.label}</b>
                <span className="font-sans text-[10px] font-normal uppercase tracking-[.22em] opacity-85">{c.meta}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Nouveautés */}
      <section className="wrap pb-16 lg:pb-28">
        <SectionHead eyebrow="Fraîchement arrivées" aside={
          <div className="flex gap-2">
            {[[-1, IconLeft, "Précédent"], [1, IconRight, "Suivant"]].map(([d, I, l]) => (
              <button key={d} onClick={() => scroll(d)} aria-label={l} className="grid h-[46px] w-[46px] place-items-center rounded-full border border-line-strong transition-colors hover:bg-fg hover:text-bg"><I /></button>
            ))}
          </div>}>Nouveautés</SectionHead>
        <div ref={rail} className="no-scrollbar grid snap-x snap-mandatory auto-cols-[68%] grid-flow-col gap-4 overflow-x-auto pb-1.5 sm:auto-cols-[calc((100%-48px)/3)] sm:gap-6 lg:auto-cols-[calc((100%-72px)/4)]">
          {newArrivals.map((p) => <div key={p.id} className="snap-start"><ProductCard product={p} /></div>)}
        </div>
      </section>

      {/* Éditorial */}
      <section className="wrap grid items-center gap-8 pb-16 md:grid-cols-[1.3fr_1fr] md:gap-16 lg:gap-24 lg:pb-28">
        <div className="aspect-[5/4] overflow-hidden"><Art id={3} color="bordeaux" v={1} /></div>
        <div className="grid max-w-[46ch] gap-[22px]">
          <p className="eyebrow">Lookbook · Nocturne</p>
          <blockquote className="font-display text-[clamp(28px,3.2vw,44px)] font-light italic leading-tight">« Une dentelle ne se montre pas, elle se devine. »</blockquote>
          <p className="text-muted">Pour l’automne, la Maison revisite les codes du boudoir : tulles brodés à la main, velours profonds et satins coupés en biais. Une palette de prune, de bordeaux et de noir, éclairée d’un rose poudré.</p>
          <Link to="/categorie/lingerie" className="lnk justify-self-start">Voir la collection</Link>
        </div>
      </section>

      {/* Univers Couple */}
      <section className="bg-plum py-16 text-plum-fg transition-colors duration-500 lg:py-28">
        <div className="wrap grid items-center gap-10 md:grid-cols-[1fr_1.2fr] md:gap-20">
          <div>
            <p className="eyebrow !text-plum-muted">Univers Couple</p>
            <h2 className="mb-[22px] mt-4 text-[clamp(38px,5vw,68px)] leading-[1.02]">Cultiver le désir, <span className="italic text-rose">à deux.</span></h2>
            <p className="max-w-[44ch] text-plum-muted">Huiles et bougies de massage, accessoires en soie, jeux de complicité et objets de bien-être intime, choisis pour leur élégance et la qualité de leurs matières.</p>
            <Link to="/categorie/couple" className="btn mt-8 !border-rose !bg-rose !text-[#1A0F17] hover:!bg-transparent hover:!text-plum-fg">Entrer dans l’univers <IconArrow className="h-4 w-4" /></Link>
            <div className="mt-[22px] flex items-center gap-2.5 font-sans text-[10.5px] font-normal uppercase tracking-[.2em] text-plum-muted">
              <b className="grid h-[34px] w-[34px] place-items-center rounded-full border border-plum-fg/20 font-normal tracking-normal text-plum-fg">18+</b>
              Accès réservé aux adultes · Colis neutre
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="aspect-[3/4] overflow-hidden"><Art id={19} color="champagne" /></div>
            <div className="mt-14 aspect-[3/4] overflow-hidden"><Art id={21} color="rose" /></div>
          </div>
        </div>
      </section>

      <section className="wrap py-16 lg:py-28"><Perks /></section>

      {/* Newsletter */}
      <section className="wrap grid justify-items-center gap-4 pb-16 text-center lg:pb-28">
        <p className="eyebrow">Le cercle Myintimy</p>
        <h2 className="text-[clamp(34px,4vw,52px)]">Les avant-premières, <span className="ital">en confidence</span></h2>
        <p className="max-w-[52ch] text-muted">Inscrivez-vous pour recevoir nos nouvelles collections avant tout le monde et une attention de bienvenue sur votre première commande.</p>
        <form onSubmit={(e) => { e.preventDefault(); setMsg("Merci. Votre inscription au cercle est confirmée."); setEmail(""); }} className="mt-4 flex w-full max-w-[520px] border-b border-line-strong">
          <label htmlFor="nl" className="sr-only">Adresse e-mail</label>
          <input id="nl" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre adresse e-mail" className="min-w-0 flex-1 border-0 bg-transparent px-1 py-4 text-[15px] outline-none" />
          <button type="submit" className="px-2 font-sans text-[11px] font-normal uppercase tracking-[.22em]">S’inscrire</button>
        </form>
        <p className="min-h-[1.5em] font-display text-lg italic text-accent">{msg}</p>
      </section>
    </>
  );
}
