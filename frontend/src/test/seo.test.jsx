import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applySeo, getSeoMetadata, ROUTE_SEO } from "../utils/seo.js";
import App from "../App.jsx";
import { ShopProvider } from "../context/ShopContext.jsx";
import { CatalogProvider } from "../catalog/CatalogProvider.jsx";
import { ClientProvider } from "../account/ClientProvider.jsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Tâche 12 — Ajouter les métadonnées SEO essentielles", () => {
  beforeEach(() => {
    // Mock window.scrollTo
    window.scrollTo = vi.fn();
    // Reset document head
    document.title = "";
    document.head.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
  });

  describe("Critère 1 : Chaque page principale possède un titre pertinent", () => {
    it("définit des titres uniques et évocateurs pour les pages clés", () => {
      expect(getSeoMetadata("/").title).toContain("Myintimy");
      expect(getSeoMetadata("/").title).toMatch(/Lingerie fine/i);

      expect(getSeoMetadata("/categorie/lingerie").title).toMatch(/Lingerie Fine/i);
      expect(getSeoMetadata("/categorie/couple").title).toMatch(/Univers Couple/i);
      expect(getSeoMetadata("/commande").title).toMatch(/Finaliser ma Commande/i);
      expect(getSeoMetadata("/livraison").title).toMatch(/Livraison Discrète/i);
      expect(getSeoMetadata("/retours").title).toMatch(/Retours/i);
      expect(getSeoMetadata("/cgv").title).toMatch(/Conditions Générales/i);
      expect(getSeoMetadata("/confidentialite").title).toMatch(/Confidentialité/i);
      expect(getSeoMetadata("/contact").title).toMatch(/Contact/i);
    });

    it("génère un titre dynamique pour les fiches produits", () => {
      const product = { name: "Nuisette Clair de Lune", description: "Satin de soie délicat" };
      const meta = getSeoMetadata("/produit/1", { product });

      expect(meta.title).toBe("Nuisette Clair de Lune — Myintimy");
      expect(meta.description).toBe("Satin de soie délicat");
    });
  });

  describe("Critère 2 : Une meta description adaptée est définie", () => {
    it("associe une description riche et non vide pour chaque page", () => {
      for (const [route, info] of Object.entries(ROUTE_SEO)) {
        expect(info.description, `La route ${route} doit avoir une description`).toBeDefined();
        expect(info.description.length).toBeGreaterThan(20);
        expect(info.description).toMatch(/Myintimy|Lingerie|Bénin|commande|discrète|soie|dentelle/i);
      }
    });

    it("injecte et met à jour la balise meta description dans le DOM", () => {
      const meta = getSeoMetadata("/livraison");
      applySeo(meta);

      const descTag = document.querySelector('meta[name="description"]');
      expect(descTag).toBeInTheDocument();
      expect(descTag.getAttribute("content")).toBe(meta.description);
    });
  });

  describe("Critère 3 : Le favicon Myintimy est configuré", () => {
    it("fournit le fichier SVG du favicon dans public/favicon.svg", () => {
      const faviconPath = path.resolve(__dirname, "../../public/favicon.svg");
      expect(fs.existsSync(faviconPath)).toBe(true);

      const svgContent = fs.readFileSync(faviconPath, "utf-8");
      expect(svgContent).toContain("<svg");
      expect(svgContent).toContain("M");
    });

    it("déclare la balise link rel=icon dans index.html", () => {
      const htmlPath = path.resolve(__dirname, "../../index.html");
      const htmlContent = fs.readFileSync(htmlPath, "utf-8");

      expect(htmlContent).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg"');
    });
  });

  describe("Critère 4 : Les métadonnées Open Graph principales sont présentes", () => {
    it("déclare les métadonnées Open Graph essentielles dans index.html", () => {
      const htmlPath = path.resolve(__dirname, "../../index.html");
      const htmlContent = fs.readFileSync(htmlPath, "utf-8");

      expect(htmlContent).toContain('property="og:type" content="website"');
      expect(htmlContent).toContain('property="og:site_name" content="Myintimy"');
      expect(htmlContent).toContain('property="og:title"');
      expect(htmlContent).toContain('property="og:description"');
      expect(htmlContent).toContain('property="og:image"');
      expect(htmlContent).toContain('property="og:locale" content="fr_FR"');
    });

    it("déclare également les métadonnées Twitter Card", () => {
      const htmlPath = path.resolve(__dirname, "../../index.html");
      const htmlContent = fs.readFileSync(htmlPath, "utf-8");

      expect(htmlContent).toContain('name="twitter:card" content="summary"');
      expect(htmlContent).toContain('name="twitter:title"');
      expect(htmlContent).toContain('name="twitter:description"');
    });
  });

  describe("Critère 5 : Les pages administrateur ne doivent pas être indexées", () => {
    it("indique noindex: true pour toutes les routes /admin", () => {
      expect(getSeoMetadata("/admin").noindex).toBe(true);
      expect(getSeoMetadata("/admin/login").noindex).toBe(true);
      expect(getSeoMetadata("/admin/orders").noindex).toBe(true);
      expect(getSeoMetadata("/admin/products").noindex).toBe(true);
      expect(getSeoMetadata("/admin/shipping").noindex).toBe(true);
    });

    it("injecte une balise meta name=robots content=noindex, nofollow sur l'admin", () => {
      const adminMeta = getSeoMetadata("/admin");
      applySeo(adminMeta);

      const robotsTag = document.querySelector('meta[name="robots"]');
      expect(robotsTag).toBeInTheDocument();
      expect(robotsTag.getAttribute("content")).toBe("noindex, nofollow");
      expect(document.title).toBe("Administration — Myintimy");
    });

    it("rétablit l'indexation normale (index, follow) lors du retour sur une page publique", () => {
      // 1. Visite de l'admin
      applySeo(getSeoMetadata("/admin"));
      expect(document.querySelector('meta[name="robots"]').getAttribute("content")).toBe("noindex, nofollow");

      // 2. Retour sur l'accueil
      applySeo(getSeoMetadata("/"));
      expect(document.querySelector('meta[name="robots"]').getAttribute("content")).toBe("index, follow");
    });
  });

  describe("Critère 6 : Les informations SEO n’altèrent pas le fonctionnement du HashRouter", () => {
    it("met à jour le titre et les meta sans altérer les fragments de hachage (#) ni bloquer le routage", () => {
      // Test de montage avec HashRouter
      window.location.hash = "#/livraison";

      render(
        <HashRouter>
          <CatalogProvider>
            <ClientProvider>
              <ShopProvider>
                <App />
              </ShopProvider>
            </ClientProvider>
          </CatalogProvider>
        </HashRouter>,
      );

      // La page livraison se charge correctement
      expect(screen.getByRole("heading", { level: 1, name: /Livraison discrète/i })).toBeInTheDocument();

      // Le titre du document a été actualisé sans casser l'URL hash
      expect(document.title).toBe("Livraison Discrète & Délais — Myintimy");
      expect(window.location.hash).toBe("#/livraison");
    });
  });
});

