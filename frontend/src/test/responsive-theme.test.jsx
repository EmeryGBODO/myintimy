import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Header from "../components/Header.jsx";
import AdminLayout from "../admin/AdminLayout.jsx";
import { CatalogProvider } from "../catalog/CatalogProvider.jsx";
import { ClientProvider } from "../account/ClientProvider.jsx";
import { ShopProvider } from "../context/ShopContext.jsx";
import AdminProvider from "../admin/AdminProvider.jsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function TestPublicWrapper({ children }) {
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

function TestAdminWrapper({ children }) {
  return (
    <BrowserRouter>
      <CatalogProvider>
        <ClientProvider>
          <ShopProvider>
            <AdminProvider>{children}</AdminProvider>
          </ShopProvider>
        </ClientProvider>
      </CatalogProvider>
    </BrowserRouter>
  );
}

describe("Tâche 9 — Revue responsive et thème clair/sombre", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Charte graphique et tokens Myintimy (index.css & tailwind.config.js)", () => {
    it("définit le fond clair exactement à #FAF7F5 (250 247 245)", () => {
      const cssPath = path.resolve(__dirname, "../index.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");

      // Vérification que le fond en mode clair est 250 247 245 = #FAF7F5
      expect(cssContent).toMatch(/--bg:\s*250\s+247\s+245/);
    });

    it("préserve Cormorant Garamond et Jost dans tailwind.config.js", () => {
      const configPath = path.resolve(__dirname, "../../tailwind.config.js");
      const configContent = fs.readFileSync(configPath, "utf-8");

      expect(configContent).toContain("Cormorant Garamond");
      expect(configContent).toContain("Jost");
    });

    it("définit les tokens de thème sombre pour les surfaces, textes et statuts", () => {
      const cssPath = path.resolve(__dirname, "../index.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");

      expect(cssContent).toContain('[data-theme="dark"]');
      expect(cssContent).toMatch(/--surface:\s*23\s+18\s+23/);
      expect(cssContent).toMatch(/--fg:\s*244\s+238\s+240/);
      expect(cssContent).toMatch(/--accent:\s*232\s+180\s+200/);
    });

    it("ne remplace pas la charte par des classes blanc/noir génériques non souhaitées", () => {
      const sharedPath = path.resolve(__dirname, "../components/Shared.jsx");
      const sharedContent = fs.readFileSync(sharedPath, "utf-8");
      expect(sharedContent).not.toContain("text-white");
      expect(sharedContent).not.toContain("bg-white");

      const adminUIPath = path.resolve(__dirname, "../admin/AdminUI.jsx");
      const adminUIContent = fs.readFileSync(adminUIPath, "utf-8");
      expect(adminUIContent).not.toContain("text-white");
      expect(adminUIContent).not.toContain("bg-white");
    });
  });

  describe("Adaptabilité responsive (Mobile 375px, Tablette 768px, Desktop)", () => {
    it("affiche le header public avec navigation adaptée mobile et desktop", () => {
      render(
        <TestPublicWrapper>
          <Header />
        </TestPublicWrapper>,
      );

      // Bouton menu burger pour mobile / tablette
      const menuBtn = screen.getByLabelText("Ouvrir le menu");
      expect(menuBtn).toBeInTheDocument();
      expect(menuBtn).toHaveClass("xl:hidden");

      // Navigation desktop masquée sur mobile
      const desktopNav = screen.getByLabelText("Navigation principale");
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav).toHaveClass("hidden", "xl:flex");

      // Bouton de bascule de thème accessible
      const themeButtons = screen.getAllByLabelText(/mode (sombre|clair)/i);
      expect(themeButtons.length).toBeGreaterThan(0);
    });

    it("l'administration fournit une barre de navigation mobile et une barre latérale desktop", () => {
      render(
        <TestAdminWrapper>
          <AdminLayout />
        </TestAdminWrapper>,
      );

      // Barre de navigation admin
      const adminNav = screen.getByLabelText("Navigation de l’administration");
      expect(adminNav).toBeInTheDocument();

      // Navigation horizontale sans scrollbar bloquante sur mobile et verticale sur desktop
      expect(adminNav).toHaveClass("flex", "overflow-x-auto", "lg:flex-col");
    });
  });

  describe("Tableaux et formulaires administratifs responsive", () => {
    it("AdminOrders intègre une vue carte pour mobile (< 768px) et tableau pour desktop", () => {
      const ordersPath = path.resolve(__dirname, "../pages/admin/AdminOrders.jsx");
      const content = fs.readFileSync(ordersPath, "utf-8");

      expect(content).toContain("md:hidden");
      expect(content).toContain("hidden overflow-x-auto md:block");
    });

    it("AdminInventory intègre une vue empilée pour petits écrans et tableau à défilement", () => {
      const invPath = path.resolve(__dirname, "../pages/admin/AdminInventory.jsx");
      const content = fs.readFileSync(invPath, "utf-8");

      expect(content).toContain("lg:hidden");
      expect(content).toContain("hidden overflow-x-auto lg:block");
    });

    it("AdminShipping intègre des cartes mobiles et un tableau défilable pour la tarification", () => {
      const shippingPath = path.resolve(__dirname, "../pages/admin/AdminShipping.jsx");
      const content = fs.readFileSync(shippingPath, "utf-8");

      expect(content).toContain("md:hidden");
      expect(content).toContain("hidden overflow-x-auto md:block");
    });
  });
});
