import { Link } from "react-router-dom";
import { PageHead } from "../components/Shared.jsx";

export default function Returns() {
  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Retours & Remboursements" }]}
        title={<>Retours & <span className="ital">Remboursements</span></>}
      >
        Toutes les informations pour échanger une pièce ou retourner un article en toute simplicité.
      </PageHead>

      <section className="wrap max-w-[880px] pb-24 pt-4 text-[15px] leading-relaxed">
        {/* Encart informatif */}
        <div className="mb-10 border border-line-strong bg-surface p-5 text-xs text-muted sm:text-sm">
          <p className="font-medium text-fg">Document préparatoire de mise en ligne</p>
          <p className="mt-1">
            Ce protocole définit les règles applicables aux échanges et retours d'articles.
            Version soumise à la confirmation définitive des protocoles sanitaires de la Maison Myintimy.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">1. Délai de Rétractation de 14 Jours</h2>
            <p className="text-muted">
              À compter du jour de réception de votre commande, vous disposez d'un délai de <strong>14 jours calendaires</strong> pour
              nous notifier votre souhait de retourner ou d'échanger un ou plusieurs articles.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">2. Conditions Strictes d’Hygiène & d’Éligibilité</h2>
            <p className="text-muted">
              Compte tenu de la nature intime de nos créations, aucun compromis ne peut être consenti sur l’hygiène.
              Tout article retourné fait l'objet d'un contrôle rigoureux à sa réception :
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="border border-line bg-bg p-4">
                <h3 className="font-medium text-fg">Lingerie & Prêt-à-porter de Nuit</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-muted">
                  <li>✓ Non porté (essayage uniquement par-dessus vos sous-vêtements personnels).</li>
                  <li>✓ Non lavé, sans parfum ni tâche.</li>
                  <li>✓ Étiquettes cousues et bande de protection hygiénique intactes.</li>
                  <li>✓ Écrin et pochette de satin d'origine fournis.</li>
                </ul>
              </div>

              <div className="border border-line bg-bg p-4">
                <h3 className="font-medium text-fg">Univers Couple (Santé & Sécurité)</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-muted">
                  <li>⚠ <strong>Articles non repris dès ouverture :</strong> Pour des raisons évidentes de protection de la santé et d'hygiène, les huiles, bougies, cosmétiques intimes et objets dont le scellé de sécurité a été brisé ne sont ni repris ni échangés.</li>
                  <li>✓ Seuls les coffrets neufs sous film thermo-scellé d'origine sont acceptés.</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">3. Comment Effectuer un Retour ?</h2>
            <p className="text-muted">
              La démarche est fluide et discrète :
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted">
              <li>
                <strong>Contactez notre service client</strong> via notre <Link to="/contact" className="underline hover:text-fg">formulaire de contact</Link> ou directement par WhatsApp en précisant votre numéro de commande et la référence de l’article concerné.
              </li>
              <li>
                <strong>Préparez votre colis</strong> en remettant la pièce dans son écrin d’origine et en la plaçant dans un emballage neutre et fermé.
              </li>
              <li>
                <strong>Prise en charge</strong> : selon votre zone, un coursier partenaire vient récupérer le colis à votre adresse ou vous le déposez au point relais convenu.
              </li>
            </ol>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">4. Modalités d’Échange ou de Remboursement</h2>
            <p className="text-muted">
              Dès réception et validation de la conformité de l’article par notre atelier de contrôle qualité :
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-6 text-muted">
              <li><strong>Échange de taille ou de modèle :</strong> La nouvelle pièce est expédiée sous 24 à 48 heures.</li>
              <li><strong>Avoir ou Bon d’achat :</strong> Crédité immédiatement sur votre compte client, valable 1 an sur l’ensemble du catalogue.</li>
              <li><strong>Remboursement :</strong> Effectué en espèces ou par virement Mobile Money selon la modalité convenue avec le client sous 3 à 5 jours ouvrés.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">5. Article Défectueux ou Erreur de Préparation</h2>
            <p className="text-muted">
              Chaque pièce est minutieusement vérifiée avant son envoi. Si toutefois un article présentait un défaut de fabrication
              ou si une erreur de taille survenait de notre part, les frais de réexpédition et de retour sont intégralement pris en charge
              par Myintimy, et la pièce est remplacée en priorité absolue.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

