import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ShopProvider } from "../context/ShopContext.jsx";
import { useShop } from "../context/shop-context.js";
import { CatalogProvider } from "../catalog/CatalogProvider.jsx";
import { ClientProvider } from "../account/ClientProvider.jsx";
import { CartDrawer, Qty } from "../components/Overlays.jsx";
import ProductImage from "../components/ProductImage.jsx";
import Header from "../components/Header.jsx";
import AccountLogin from "../pages/account/AccountLogin.jsx";
import Product from "../pages/Product.jsx";
import App from "../App.jsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function TestWrapper({ children }) {
  return (
    <BrowserRouter>
      <CatalogProvider>
        <ClientProvider>
          <ShopProvider>{children}</ShopProvider>
        </ClientProvider>
      </CatalogProvider>
    </BrowserRouter>
  );
}

function CartOpener() {
  const { openPanel } = useShop();
  return (
    <button type="button" onClick={() => openPanel("cart")}>
      Ouvrir Panier
    </button>
  );
}

describe("Tâche 10 — Améliorer l’accessibilité de base", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Critère 1 : Tous les champs possèdent un label identifiable", () => {
    it("le formulaire de connexion fournit des labels identifiables et des inputs avec nom accessible", () => {
      render(
        <TestWrapper>
          <AccountLogin />
        </TestWrapper>,
      );

      const emailInput = screen.getByLabelText(/e-mail/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    it("la recherche et la newsletter ont des labels explicites ou masqués pour lecteurs d'écran", () => {
      const homePath = path.resolve(__dirname, "../pages/Home.jsx");
      const homeContent = fs.readFileSync(homePath, "utf-8");

      expect(homeContent).toContain('htmlFor="nl"');
      expect(homeContent).toContain('id="nl"');

      const overlaysPath = path.resolve(__dirname, "../components/Overlays.jsx");
      const overlaysContent = fs.readFileSync(overlaysPath, "utf-8");
      expect(overlaysContent).toContain('aria-label="Rechercher un article"');
    });
  });

  describe("Critère 2 : Les boutons sont de vrais éléments interactifs adaptés", () => {
    it("les boutons de commande de quantité sont de vrais boutons avec libellé accessible", () => {
      const handleMinus = vi.fn();
      const handlePlus = vi.fn();

      render(<Qty value={2} onMinus={handleMinus} onPlus={handlePlus} />);

      const minusBtn = screen.getByRole("button", { name: "Diminuer la quantité" });
      const plusBtn = screen.getByRole("button", { name: "Augmenter la quantité" });

      expect(minusBtn).toBeInTheDocument();
      expect(plusBtn).toBeInTheDocument();
      expect(minusBtn).toHaveAttribute("type", "button");
      expect(plusBtn).toHaveAttribute("type", "button");

      fireEvent.click(minusBtn);
      expect(handleMinus).toHaveBeenCalledTimes(1);

      fireEvent.click(plusBtn);
      expect(handlePlus).toHaveBeenCalledTimes(1);
    });

    it("le header utilise de vrais boutons avec libellés dynamiques pour panier et favoris", () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>,
      );

      const cartBtn = screen.getByRole("button", { name: /panier/i });
      expect(cartBtn).toHaveAttribute("type", "button");

      const menuBtn = screen.getByRole("button", { name: /ouvrir le menu/i });
      expect(menuBtn).toHaveAttribute("type", "button");
    });
  });

  describe("Critère 3 : Le focus clavier est visible", () => {
    it("définit des règles de focus-visible nettes et contrastées dans index.css", () => {
      const cssPath = path.resolve(__dirname, "../index.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");

      expect(cssContent).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid rgb\(var\(--accent\)\)/);
      expect(cssContent).toMatch(/\.field:focus-visible/);
    });
  });

  describe("Critère 4 : Les modales sont utilisables au clavier (rôles et touche Escape)", () => {
    it("la modale générique et les panneaux possèdent role=dialog et aria-modal=true", () => {
      const overlaysPath = path.resolve(__dirname, "../components/Overlays.jsx");
      const overlaysContent = fs.readFileSync(overlaysPath, "utf-8");

      expect(overlaysContent).toContain('role="dialog"');
      expect(overlaysContent).toContain('aria-modal="true"');
    });

    it("ferme le panneau panier lorsque la touche Escape est pressée", () => {
      render(
        <TestWrapper>
          <CartOpener />
          <CartDrawer />
        </TestWrapper>,
      );

      // Ouvrir le panier
      fireEvent.click(screen.getByRole("button", { name: "Ouvrir Panier" }));

      // Le panier est ouvert et le dialog est accessible
      const drawer = screen.getByRole("dialog", { name: /panier/i });
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveAttribute("aria-hidden", "false");

      // Appuyer sur Escape
      fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

      // Le panier se referme (aria-hidden devient true)
      expect(drawer).toHaveAttribute("aria-hidden", "true");
    });

    it("garde le panier ouvert après un clic sur son bouton dans le header", () => {
      vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      render(
        <TestWrapper>
          <App />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByRole("button", { name: /^panier/i }));

      expect(screen.getByRole("dialog", { name: /panier/i })).toHaveAttribute("aria-hidden", "false");
    });
  });

  describe("Critère 5 : Les images produit possèdent un texte alternatif pertinent", () => {
    it("affiche un attribut alt descriptif pour les images produit réelles", () => {
      const mockProduct = {
        id: "test-prod",
        name: "Nuisette Soie Impériale",
        images: ["/images/test.jpg"],
      };

      render(<ProductImage product={mockProduct} color="noir" />);

      const img = screen.getByAltText("Nuisette Soie Impériale");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/images/test.jpg");
    });

    it("fournit role=img et un aria-label pour l'illustration vectorielle en l'absence de photo", () => {
      const mockProduct = {
        id: "test-svg-prod",
        name: "Body Dentelle Nuit",
        images: [],
      };

      render(<ProductImage product={mockProduct} color="noir" />);

      const illustration = screen.getByRole("img", { name: /Body Dentelle Nuit/i });
      expect(illustration).toBeInTheDocument();
    });
  });

  describe("Critère 6 : Les erreurs de formulaire sont compréhensibles", () => {
    it("signale les erreurs avec role=alert dans le formulaire de fiche produit", () => {
      render(
        <TestWrapper>
          <Product id={1} />
        </TestWrapper>,
      );

      const addBtn = screen.getByRole("button", { name: "Ajouter au panier" });
      fireEvent.click(addBtn);

      const alertMsg = screen.getByRole("alert");
      expect(alertMsg).toBeInTheDocument();
      expect(alertMsg).toHaveTextContent("Choisissez une taille pour continuer.");
    });
  });

  describe("Critère 7 : Les contrastes importants restent lisibles dans les deux thèmes", () => {
    it("définit des variables de texte et de fond hautement contrastées pour les deux thèmes", () => {
      const cssPath = path.resolve(__dirname, "../index.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");

      // Mode clair : fond 250 247 245 (#FAF7F5), texte 22 17 26 (très foncé) -> ratio > 15:1
      expect(cssContent).toMatch(/--bg:\s*250\s+247\s+245/);
      expect(cssContent).toMatch(/--fg:\s*22\s+17\s+26/);

      // Mode sombre : fond 13 11 13 (#0D0B0D), texte 244 238 240 (très clair) -> ratio > 15:1
      expect(cssContent).toMatch(/--bg:\s*13\s+11\s+13/);
      expect(cssContent).toMatch(/--fg:\s*244\s+238\s+240/);
    });
  });
});
