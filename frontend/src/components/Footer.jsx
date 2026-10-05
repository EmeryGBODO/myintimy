import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext.jsx";

const H = ({ children }) => <h4 className="mb-[18px] font-sans text-[10.5px] font-normal uppercase tracking-[.24em] text-muted">{children}</h4>;

export default function Footer() {
  const { openPanel } = useShop();
  return (
    <footer className="border-t border-line pb-10 pt-[72px]">
      <div className="wrap">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <div className="font-display text-[26px] font-light uppercase tracking-[.42em]">Myintimy</div>
            <p className="mt-[18px] max-w-[34ch] text-sm text-muted">Lingerie de luxe, vêtements fluides et objets de complicité. Chaque commande voyage dans un écrin neutre, sans mention de la marque.</p>
          </div>
          <div><H>Boutique</H><ul className="grid gap-2.5 text-sm">
            {[["nouveautes", "Nouveautés"], ["lingerie", "Lingerie"], ["vetements", "Vêtements"], ["nuit", "Nuit & Détente"], ["couple", "Univers Couple"]].map(([k, l]) => <li key={k}><Link className="hover:text-accent" to={`/categorie/${k}`}>{l}</Link></li>)}
          </ul></div>
          <div><H>Service client</H><ul className="grid gap-2.5 text-sm">
            <li><button className="hover:text-accent" onClick={() => openPanel("sizes")}>Guide des tailles</button></li>
            <li><Link className="hover:text-accent" to="/livraison">Livraison discrète</Link></li>
            <li><Link className="hover:text-accent" to="/livraison">Retours sous 14 jours</Link></li>
            <li>WhatsApp : <span className="select-all">+229 01 00 00 00 00</span></li>
          </ul></div>
          <div><H>Maison</H><ul className="grid gap-2.5 text-sm">
            <li><Link className="hover:text-accent" to="/livraison">Nos engagements</Link></li>
            <li>Instagram · @myintimy</li><li>TikTok · @myintimy</li><li>Facebook · Myintimy</li>
          </ul></div>
        </div>
        <div className="mt-14 flex flex-wrap justify-between gap-4 border-t border-line pt-6 text-xs tracking-wide text-muted">
          <span>© 2026 Myintimy · Mentions légales · CGV · Confidentialité</span>
          <span>Vente réservée aux personnes majeures pour l’Univers Couple</span>
        </div>
      </div>
    </footer>
  );
}
