import { Link } from "react-router-dom";
import { PageHead } from "../components/Shared.jsx";

export default function Legal() {
  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Mentions Légales" }]}
        title={<>Mentions <span className="ital">Légales</span></>}
      >
        Informations éditoriales, hébergement et cadre légal de la plateforme Myintimy.
      </PageHead>

      <section className="wrap max-w-[880px] pb-24 pt-4 text-[15px] leading-relaxed">
        {/* Encart de validation juridique */}
        <div className="mb-10 border border-line-strong bg-surface p-5 text-xs text-muted sm:text-sm">
          <p className="font-medium text-fg">Document préparatoire de mise en ligne</p>
          <p className="mt-1">
            Les mentions ci-après précisent les informations d’identification de l’éditeur et du service en cours d’immatriculation.
            Version soumise à la confirmation des mentions définitives au Registre du Commerce et du Crédit Mobilier (RCCM).
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">1. Éditeur de la Plateforme</h2>
            <p className="text-muted">
              Le site Internet accessible à l'adresse <strong>myintimy.com</strong> est édité par la <strong>Maison Myintimy</strong> :
            </p>
            <ul className="mt-2 space-y-1 text-muted">
              <li><strong>Siège d'exploitation</strong> : Cotonou, République du Bénin.</li>
              <li><strong>Activité</strong> : Création, confection et distribution de lingerie fine, prêt-à-porter et bien-être intime.</li>
              <li><strong>E-mail</strong> : contact@myintimy.com</li>
              <li><strong>Contact direct / WhatsApp</strong> : +229 01 00 00 00 00</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">2. Direction de la Publication</h2>
            <p className="text-muted">
              La direction de la publication et la direction artistique sont assurées par la fondation de la Maison Myintimy.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">3. Hébergement & Infrastructure Technique</h2>
            <p className="text-muted">
              L'infrastructure web et les services de données sont hébergés sur des serveurs sécurisés garantissant un haut niveau de disponibilité
              et de chiffrement des flux de communication (certificats SSL/TLS).
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">4. Propriété Intellectuelle</h2>
            <p className="text-muted">
              L’ensemble des éléments composant le site (notamment la marque <strong>Myintimy</strong>, le logo, les photographies,
              les créations graphiques, les textes, les illustrations vectorielles, l'architecture et les codes sources)
              sont protégés par les lois béninoises et internationales relatives à la propriété intellectuelle.
              Toute reproduction, représentation, diffusion ou exploitation, totale ou partielle, sans l'accord préalable écrit de Myintimy est formellement interdite.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">5. Protection des Mineurs</h2>
            <p className="text-muted">
              En conformité avec les dispositions légales, la consultation et l’achat d’articles au sein de la section <strong>Univers Couple</strong>
              sont strictement réservés aux personnes âgées de 18 ans et plus. Un dispositif de vérification préalable d'âge est intégré au site.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">6. Liens Utiles & Réglementation</h2>
            <p className="text-muted">
              Pour consulter l'ensemble des règles contractuelles et la politique relative aux données, veuillez vous référer à nos{" "}
              <Link to="/cgv" className="underline hover:text-fg">Conditions Générales de Vente</Link> ainsi qu'à notre{" "}
              <Link to="/confidentialite" className="underline hover:text-fg">Politique de Confidentialité</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

