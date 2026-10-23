import { Link } from "react-router-dom";
import { PageHead } from "../components/Shared.jsx";

export default function Terms() {
  return (
    <>
      <PageHead
        crumbs={[{ to: "/", label: "Accueil" }, { label: "Conditions Générales de Vente" }]}
        title={<>Conditions Générales <span className="ital">de Vente</span></>}
      >
        Les présentes conditions régissent l'ensemble des ventes conclues sur la boutique en ligne Myintimy.
      </PageHead>

      <section className="wrap max-w-[880px] pb-24 pt-4 text-[15px] leading-relaxed">
        {/* Encart de validation juridique */}
        <div className="mb-10 border border-line-strong bg-surface p-5 text-xs text-muted sm:text-sm">
          <p className="font-medium text-fg">Document préparatoire de mise en ligne</p>
          <p className="mt-1">
            Les stipulations ci-dessous constituent la version de référence soumise à la relecture et validation finale
            par le conseil juridique de la Maison Myintimy avant exploitation définitive.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 1 — Objet & Champ d'application</h2>
            <p className="text-muted">
              Les présentes Conditions Générales de Vente (CGV) s’appliquent à toutes les commandes d'articles de lingerie fine,
              de vêtements de nuit et d'objets de complicité passées auprès de <strong>Myintimy</strong> via son site Internet.
              Toute confirmation de commande implique l'adhésion pleine et entière du client aux présentes conditions.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 2 — Produits & Disponibilité</h2>
            <p className="text-muted">
              Les pièces proposées à la vente sont décrites et présentées avec la plus grande exactitude possible.
              Nos offres sont valables tant qu’elles sont visibles sur le site et dans la limite des stocks disponibles.
              En cas d’indisponibilité exceptionnelle d’un article après passation de commande, le client est immédiatement
              informé et la réservation est annulée sans frais.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 3 — Prix & Devise de Facturation</h2>
            <p className="text-muted">
              Tous les prix sont exprimés en Francs CFA (XOF), toutes taxes comprises (TTC). Les frais de livraison sont indiqués
              avant la validation finale de la commande et dépendent de la zone géographique de livraison au Bénin.
              Myintimy se réserve le droit de modifier ses prix à tout moment, mais les produits sont facturés sur la base des tarifs
              en vigueur au moment de l’enregistrement de la commande.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 4 — Modalités de Commande & Réservation</h2>
            <p className="text-muted">
              La commande s'effectue en sélectionnant les articles, tailles et couleurs souhaités, puis en renseignant les coordonnées
              de livraison. Le client vérifie le récapitulatif de sa commande avant confirmation. Dès enregistrement, un e-mail ou
              message de confirmation récapitulant les détails et le numéro de commande est adressé au client.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 5 — Modalités de Règlement</h2>
            <p className="text-muted">
              Pour la version actuelle du service, le règlement s’effectue <strong>au comptant à la livraison</strong> en espèces auprès
              du livreur ou transporteur mandaté. Le déploiement des paiements électroniques sécurisés (Mobile Money et cartes bancaires)
              s'effectuera de façon progressive et fera l'objet d'une mise à jour des présentes.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 6 — Livraison Discrète & Délais</h2>
            <p className="text-muted">
              La discrétion est au cœur de l'engagement Myintimy : chaque commande voyage dans un <strong>emballage neutre, opaque et sans aucun logo extérieur</strong>.
              Les délais indicatifs de livraison sont de 24 heures pour Cotonou et ses environs, et de 48 à 72 heures pour les autres villes du Bénin.
              Pour plus d'informations, consultez notre page dédiée à la <Link to="/livraison" className="underline hover:text-fg">Livraison</Link>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 7 — Droit de Rétractation & Hygiène</h2>
            <p className="text-muted">
              Conformément aux usages du commerce et aux exigences sanitaires, le client dispose d’un délai de <strong>14 jours</strong> à compter de la réception
              pour demander l'échange ou le retour d'une pièce de lingerie ou d'un vêtement non porté, dans son emballage d'origine avec étiquettes et protection hygiénique intactes.
              Pour des raisons évidentes de protection de la santé, les articles ouverts ou utilisés de l'Univers Couple ne peuvent faire l’objet d’aucun retour.
              Détails complets sur la page <Link to="/retours" className="underline hover:text-fg">Retours & Remboursements</Link>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 8 — Protection des Mineurs (Univers Couple)</h2>
            <p className="text-muted">
              L’accès et l’achat des pièces de l'Univers Couple sont strictement réservés aux personnes majeures (18 ans et plus).
              Une confirmation d'âge est demandée avant l'entrée dans cet espace.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-light text-fg">Article 9 — Droit Applicable & Règlement des Litiges</h2>
            <p className="text-muted">
              Les présentes conditions sont soumises au droit applicable en République du Bénin. En cas de réclamation ou de désaccord,
              une solution amiable est recherchée en priorité auprès de notre <Link to="/contact" className="underline hover:text-fg">Service Client</Link>.
              À défaut d'accord amiable, les tribunaux compétents de Cotonou seront seuls habilités.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

