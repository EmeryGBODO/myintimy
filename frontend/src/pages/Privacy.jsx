import { Link } from "react-router-dom";
import { PageHead } from "../components/Shared.jsx";

export default function Privacy() {
  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Politique de Confidentialité" }]}
        title={<>Politique de <span className="ital">Confidentialité</span></>}
      >
        Votre vie privée et la discrétion de vos commandes sont notre engagement premier.
      </PageHead>

      <section className="wrap max-w-[880px] pb-24 pt-4 text-[15px] leading-relaxed">
        {/* Encart de validation juridique */}
        <div className="mb-10 border border-line-strong bg-surface p-5 text-xs text-muted sm:text-sm">
          <p className="font-medium text-fg">Document préparatoire de mise en ligne</p>
          <p className="mt-1">
            Ce document expose les principes de collecte, de traitement et de protection de vos données personnelles.
            Il est soumis à la validation finale préalable de l’éditeur avant ouverture générale.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">1. Responsable du Traitement</h2>
            <p className="text-muted">
              Les données personnelles collectées sur le site sont traitées par <strong>Maison Myintimy</strong>,
              établie à Cotonou, République du Bénin. Pour toute question relative à vos données, notre délégué à la protection
              est joignable via notre page de <Link to="/contact" className="underline hover:text-fg">contact</Link>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">2. Données Collectées</h2>
            <p className="text-muted">
              Nous limitons la collecte aux informations strictement indispensables au bon déroulement de votre commande :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted">
              <li><strong>Identité et coordonnées</strong> : Nom, prénom, numéro de téléphone, adresse e-mail.</li>
              <li><strong>Adresse de livraison</strong> : Ville, quartier, repère ou consigne spécifique pour le livreur.</li>
              <li><strong>Historique de commande</strong> : Numéros de référence, articles commandés, préférences de livraison.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">3. Finalités du Traitement</h2>
            <p className="text-muted">
              Vos informations sont traitées exclusivement pour :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted">
              <li>La préparation, l'emballage discret et l'expédition de vos commandes.</li>
              <li>Le contact téléphonique ou par message préalable à la remise du colis par notre coursier.</li>
              <li>La gestion du service client et le traitement des éventuelles demandes d'échange ou de retour.</li>
              <li>L'envoi des nouveautés et offres exclusives, uniquement si vous avez consenti à la newsletter.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">4. La Règle d'Or : Discrétion Absolue</h2>
            <p className="text-muted">
              Myintimy s'engage formellement à ne <strong>jamais divulguer, louer ni vendre vos données</strong> à des tiers à des fins commerciales.
              Nos emballages de transport sont 100 % vierges de toute mention de marque ou de catégorie d'article.
              Le livreur reçoit uniquement vos coordonnées de livraison sans aucune précision quant au contenu du colis.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">5. Destinataires des Données</h2>
            <p className="text-muted">
              Ont uniquement accès à vos données :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted">
              <li>L'équipe interne Myintimy habilitée à la préparation des commandes.</li>
              <li>Nos partenaires logistiques et livreurs, dans la limite stricte nécessaire à l'acheminement de votre colis.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">6. Durée de Conservation</h2>
            <p className="text-muted">
              Vos données sont conservées pendant la durée nécessaire à l’exécution du service et au respect des obligations légales de facturation.
              Les comptes inactifs depuis plus de 3 ans font l'objet d'une suppression ou anonymisation automatique.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">7. Vos Droits</h2>
            <p className="text-muted">
              Conformément à la réglementation applicable sur la protection des données personnelles, vous disposez à tout moment d'un droit
              d'accès, de rectification, de suppression ou d'opposition sur vos données. Pour exercer vos droits, il vous suffit de nous adresser
              une demande via notre <Link to="/contact" className="underline hover:text-fg">formulaire de contact</Link>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">8. Témoins de Connexion (Cookies)</h2>
            <p className="text-muted">
              Le site utilise uniquement des cookies et traceurs techniques strictement nécessaires au fonctionnement du service :
              conservation de votre panier d'achats, mémorisation de votre préférence de thème (clair ou sombre) et confirmation de majorité pour l'accès à l'Univers Couple.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

