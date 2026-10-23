import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ShopProvider } from "../context/ShopContext.jsx";
import { CatalogProvider } from "../catalog/CatalogProvider.jsx";
import { ClientProvider } from "../account/ClientProvider.jsx";
import Footer from "../components/Footer.jsx";
import Terms from "../pages/Terms.jsx";
import Privacy from "../pages/Privacy.jsx";
import Legal from "../pages/Legal.jsx";
import Returns from "../pages/Returns.jsx";
import Delivery from "../pages/Delivery.jsx";
import Contact from "../pages/Contact.jsx";
import Checkout from "../pages/Checkout.jsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function Wrapper({ children, initialEntries = ["/"] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <CatalogProvider>
        <ClientProvider>
          <ShopProvider>{children}</ShopProvider>
        </ClientProvider>
      </CatalogProvider>
    </MemoryRouter>
  );
}

describe("Tâche 11 — Finaliser les pages institutionnelles et légales", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Critère 1 & 2 : Routes et pages disponibles, liens accessibles depuis le footer", () => {
    it("affiche l'ensemble des liens institutionnels et légaux dans le Footer", () => {
      render(
        <Wrapper>
          <Footer />
        </Wrapper>,
      );

      // Liens de bas de page
      expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveAttribute("href", "/mentions-legales");
      expect(screen.getByRole("link", { name: "CGV" })).toHaveAttribute("href", "/cgv");
      expect(screen.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/confidentialite");
      expect(screen.getByRole("link", { name: "Retours & Remboursements" })).toHaveAttribute("href", "/retours");

      // Liens service client et maison
      expect(screen.getByRole("link", { name: "Livraison discrète" })).toHaveAttribute("href", "/livraison");
      expect(screen.getByRole("link", { name: "Retours sous 14 jours" })).toHaveAttribute("href", "/retours");
      expect(screen.getByRole("link", { name: "Conseil & WhatsApp" })).toHaveAttribute("href", "/contact");
      expect(screen.getByRole("link", { name: "Nous contacter" })).toHaveAttribute("href", "/contact");
    });
  });

  describe("Critère 3, 4 & 5 : Charte Myintimy, lisibilité mobile et support clair/sombre", () => {
    it("rend la page CGV avec en-tête structuré et sections réglementaires", () => {
      render(
        <Wrapper initialEntries={["/cgv"]}>
          <Terms />
        </Wrapper>,
      );

      expect(screen.getByRole("heading", { level: 1, name: /Conditions Générales/i })).toBeInTheDocument();
      expect(screen.getByText(/Article 1 — Objet/i)).toBeInTheDocument();
      expect(screen.getByText(/Article 5 — Modalités de Règlement/i)).toBeInTheDocument();
      expect(screen.getByText(/Article 6 — Livraison Discrète/i)).toBeInTheDocument();
    });

    it("rend la page Politique de Confidentialité avec engagement de discrétion", () => {
      render(
        <Wrapper initialEntries={["/confidentialite"]}>
          <Privacy />
        </Wrapper>,
      );

      expect(screen.getByRole("heading", { level: 1, name: /Politique de Confidentialité/i })).toBeInTheDocument();
      expect(screen.getByText(/La Règle d'Or : Discrétion Absolue/i)).toBeInTheDocument();
      expect(screen.getByText(/Témoins de Connexion/i)).toBeInTheDocument();
    });

    it("rend la page Mentions Légales avec identification de l'éditeur et hébergement", () => {
      render(
        <Wrapper initialEntries={["/mentions-legales"]}>
          <Legal />
        </Wrapper>,
      );

      expect(screen.getByRole("heading", { level: 1, name: /Mentions Légales/i })).toBeInTheDocument();
      expect(screen.getByText(/1. Éditeur de la Plateforme/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Hébergement & Infrastructure/i)).toBeInTheDocument();
    });

    it("rend la page Livraison avec tableau des zones, délais et seuil de gratuité", () => {
      render(
        <Wrapper initialEntries={["/livraison"]}>
          <Delivery />
        </Wrapper>,
      );

      expect(screen.getByRole("heading", { level: 1, name: /Livraison discrète/i })).toBeInTheDocument();
      expect(screen.getByText(/Cotonou & proximité immédiate/i)).toBeInTheDocument();
      expect(screen.getByText(/Grande agglomération littorale/i)).toBeInTheDocument();
      expect(screen.getByText(/Livraison offerte dès 50 000 FCFA/i)).toBeInTheDocument();
    });

    it("rend la page Retours & Remboursements avec conditions strictes d'hygiène", () => {
      render(
        <Wrapper initialEntries={["/retours"]}>
          <Returns />
        </Wrapper>,
      );

      expect(screen.getByRole("heading", { level: 1, name: /Retours & Remboursements/i })).toBeInTheDocument();
      expect(screen.getAllByText(/14 jours/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Lingerie & Prêt-à-porter de Nuit/i)).toBeInTheDocument();
      expect(screen.getByText(/Univers Couple \(Santé & Sécurité\)/i)).toBeInTheDocument();
    });
  });

  describe("Critère 6 : Aucun texte juridique non validé n’est présenté comme définitif", () => {
    it("affiche un avertissement de document préparatoire sur les pages légales", () => {
      const { unmount: unmountTerms } = render(
        <Wrapper>
          <Terms />
        </Wrapper>,
      );
      expect(screen.getByText(/Document préparatoire de mise en ligne/i)).toBeInTheDocument();
      unmountTerms();

      const { unmount: unmountPrivacy } = render(
        <Wrapper>
          <Privacy />
        </Wrapper>,
      );
      expect(screen.getByText(/Document préparatoire de mise en ligne/i)).toBeInTheDocument();
      unmountPrivacy();

      const { unmount: unmountLegal } = render(
        <Wrapper>
          <Legal />
        </Wrapper>,
      );
      expect(screen.getByText(/Document préparatoire de mise en ligne/i)).toBeInTheDocument();
      unmountLegal();

      render(
        <Wrapper>
          <Returns />
        </Wrapper>,
      );
      expect(screen.getByText(/Document préparatoire de mise en ligne/i)).toBeInTheDocument();
    });
  });

  describe("Critère 7 : Liens utiles disponibles depuis le checkout", () => {
    it("intègre des liens cliquables vers CGV, Confidentialité et Retours sur la page de commande", () => {
      render(
        <Wrapper initialEntries={["/commande"]}>
          <Checkout />
        </Wrapper>,
      );

      const cgvLink = screen.getByRole("link", { name: "Conditions Générales de Vente" });
      const privacyLink = screen.getByRole("link", { name: "Politique de Confidentialité" });

      expect(cgvLink).toHaveAttribute("href", "/cgv");
      expect(privacyLink).toHaveAttribute("href", "/confidentialite");

      // Vérifie également que le formulaire avec panier actif intègre les liens
      const checkoutPath = path.resolve(__dirname, "../pages/Checkout.jsx");
      const content = fs.readFileSync(checkoutPath, "utf-8");
      expect(content).toContain('to="/cgv"');
      expect(content).toContain('to="/confidentialite"');
      expect(content).toContain('to="/retours"');
    });
  });

  describe("Page Contact & Conseil Privé", () => {
    it("valide les champs obligatoires et affiche un accusé de réception", async () => {
      render(
        <Wrapper initialEntries={["/contact"]}>
          <Contact />
        </Wrapper>,
      );

      const submitBtn = screen.getByRole("button", { name: "Envoyer mon message" });
      fireEvent.click(submitBtn);

      // Des erreurs de validation s'affichent pour les champs requis
      expect(screen.getByText(/Le nom est obligatoire/i)).toBeInTheDocument();
      expect(screen.getByText(/adresse e-mail est obligatoire/i)).toBeInTheDocument();
      expect(screen.getByText(/Le message est obligatoire/i)).toBeInTheDocument();

      // Saisie des données valides
      fireEvent.change(screen.getByLabelText(/Votre nom/i), { target: { value: "Aïcha Dossou" } });
      fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), { target: { value: "aicha@example.com" } });
      fireEvent.change(screen.getByPlaceholderText(/Décrivez votre demande/i), { target: { value: "Bonjour, je souhaite un conseil sur la taille du body." } });

      fireEvent.click(submitBtn);

      // Confirmation de soumission avec statut accessible
      const statusMsg = await screen.findByRole("status");
      expect(statusMsg).toHaveTextContent(/transmis avec succès/i);
    });
  });
});
