import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="wrap grid justify-items-center gap-5 py-28 text-center">
      <p className="eyebrow">Page introuvable</p>
      <h1 className="text-[clamp(40px,6vw,76px)]">Cette page s’est <span className="ital">éclipsée</span></h1>
      <Link to="/" className="btn btn-ghost">Retour à l’accueil</Link>
    </section>
  );
}
