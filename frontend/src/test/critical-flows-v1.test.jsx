import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Checkout from "../pages/Checkout.jsx";
import Contact from "../pages/Contact.jsx";
import { CartDrawer } from "../components/Overlays.jsx";
import { PageHead } from "../components/Shared.jsx";
import { ShopContext } from "../context/shop-context.js";
import { ClientContext } from "../account/client-context.js";
import { CatalogContext } from "../catalog/catalog-context.js";
import { ordersApi } from "../api/orders.js";
import { shippingApi } from "../api/shipping.js";
import { customerApi } from "../api/customer.js";
import { ApiError } from "../api/errors.js";

describe("Tâche 13 — Tests des parcours critiques V1, validation, règles de livraison et composants", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.scrollTo = vi.fn();
    // Par défaut, l'API d'adresses renvoie une liste vide
    vi.spyOn(customerApi.addresses, "list").mockResolvedValue([]);
    // Par défaut, shippingApi.zones renvoie un tableau vide pour utiliser les règles locales
    vi.spyOn(shippingApi, "zones").mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  // Helpers de rendu avec contextes configurables
  function renderCheckout({
    cart = [
      { id: 1, key: "1-noir-M", color: "noir", size: "M", qty: 1 },
    ],
    subtotal = 38000,
    source = "api",
    clearCart = vi.fn(),
    customer = null,
  } = {}) {
    const mockProduct = {
      id: 1,
      name: "Soutien-gorge Séraphine",
      price: 38000,
      variants: [
        { id: "var-101", color: { slug: "noir" }, size: { code: "M" } },
      ],
      colorDetails: [{ slug: "noir", name: "Noir Onyx" }],
    };

    const mockShopValue = {
      cart,
      subtotal,
      clearCart,
      panel: null,
      closePanel: vi.fn(),
      openPanel: vi.fn(),
      changeQty: vi.fn(),
      removeItem: vi.fn(),
    };

    const mockClientValue = {
      customer,
      login: vi.fn(),
      logout: vi.fn(),
    };

    const mockCatalogValue = {
      getProduct: (id) => (Number(id) === 1 ? mockProduct : null),
      source,
      products: [mockProduct],
    };

    return {
      ...render(
        <MemoryRouter>
          <CatalogContext.Provider value={mockCatalogValue}>
            <ClientContext.Provider value={mockClientValue}>
              <ShopContext.Provider value={mockShopValue}>
                <Checkout />
              </ShopContext.Provider>
            </ClientContext.Provider>
          </CatalogContext.Provider>
        </MemoryRouter>,
      ),
      clearCart,
    };
  }

  describe("Critère 2 & 4 : Tests des formulaires, validations et états loading/error (Checkout)", () => {
    it("affiche l'état panier vide avec liens utiles si le panier ne contient aucun article", () => {
      renderCheckout({ cart: [], subtotal: 0 });

      expect(screen.getByText("Votre panier est vide")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Voir les nouveautés" })).toHaveAttribute("href", "/categorie/nouveautes");
      expect(screen.getByRole("link", { name: "Infos livraison" })).toHaveAttribute("href", "/livraison");
    });

    it("valide les champs obligatoires (nom, téléphone, quartier, adresse) lors de la soumission", async () => {
      renderCheckout();

      const submitBtn = screen.getByRole("button", { name: /Confirmer ·/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/Le prénom et nom est obligatoire/i)).toBeInTheDocument();
      expect(screen.getByText(/Le numéro de téléphone est obligatoire/i)).toBeInTheDocument();
      expect(screen.getByText(/Le quartier est obligatoire/i)).toBeInTheDocument();
      expect(screen.getByText(/L'adresse est obligatoire/i)).toBeInTheDocument();
    });

    it("valide la longueur minimale du nom et le format du téléphone", async () => {
      renderCheckout();

      fireEvent.change(screen.getByLabelText(/Prénom et nom/i), { target: { value: "A" } });
      fireEvent.change(screen.getByLabelText(/Téléphone/i), { target: { value: "123" } });
      fireEvent.click(screen.getByRole("button", { name: /Confirmer ·/i }));

      expect(await screen.findByText(/au moins 2 caractères/i)).toBeInTheDocument();
      expect(screen.getByText(/Numéro de téléphone invalide/i)).toBeInTheDocument();
    });

    it("valide le format de l'e-mail si l'utilisateur en fournit un", async () => {
      renderCheckout();

      fireEvent.change(screen.getByLabelText(/E-mail \(facultatif\)/i), { target: { value: "format-invalide" } });
      fireEvent.click(screen.getByRole("button", { name: /Confirmer ·/i }));

      expect(await screen.findByText(/Format d'adresse e-mail invalide/i)).toBeInTheDocument();
    });

    it("efface les erreurs au fur et à mesure que l'utilisateur corrige les champs", async () => {
      renderCheckout();

      fireEvent.click(screen.getByRole("button", { name: /Confirmer ·/i }));
      expect(await screen.findByText(/Le prénom et nom est obligatoire/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Prénom et nom/i), { target: { value: "Murielle Yenou" } });
      expect(screen.queryByText(/Le prénom et nom est obligatoire/i)).not.toBeInTheDocument();
    });

    it("gère l'état de chargement submitting et désactive les interactions", async () => {
      let resolveOrder;
      const orderPromise = new Promise((resolve) => {
        resolveOrder = resolve;
      });
      vi.spyOn(ordersApi, "create").mockReturnValue(orderPromise);

      renderCheckout();

      fireEvent.change(screen.getByLabelText(/Prénom et nom/i), { target: { value: "Murielle Yenou" } });
      fireEvent.change(screen.getByLabelText(/Téléphone/i), { target: { value: "+229 97 00 00 00" } });
      fireEvent.change(screen.getByLabelText(/Quartier/i), { target: { value: "Haie Vive" } });
      fireEvent.change(screen.getByLabelText(/Adresse ou point de repère/i), { target: { value: "Rue 102, maison 14" } });

      const submitBtn = screen.getByRole("button", { name: /Confirmer ·/i });
      fireEvent.click(submitBtn);

      // En cours de traitement
      expect(await screen.findByText(/Enregistrement…/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Enregistrement…/i })).toBeDisabled();

      // Résolution
      resolveOrder({
        reference: "MYI-2026-CONFIRMED",
        customer_name: "Murielle Yenou",
        total_xof: 39500,
      });

      await waitFor(() => {
        expect(screen.getByText("Commande enregistrée")).toBeInTheDocument();
      });
      expect(screen.getByText("MYI-2026-CONFIRMED")).toBeInTheDocument();
      expect(screen.getByText(/Total confirmé : 39 500 FCFA/i)).toBeInTheDocument();
    });

    it("affiche un message explicite si l'API de commande signale un stock insuffisant", async () => {
      vi.spyOn(ordersApi, "create").mockRejectedValue(
        new ApiError("Stock épuisé", { code: "INSUFFICIENT_STOCK", status: 409 }),
      );

      renderCheckout();

      fireEvent.change(screen.getByLabelText(/Prénom et nom/i), { target: { value: "Murielle Yenou" } });
      fireEvent.change(screen.getByLabelText(/Téléphone/i), { target: { value: "+229 97 00 00 00" } });
      fireEvent.change(screen.getByLabelText(/Quartier/i), { target: { value: "Haie Vive" } });
      fireEvent.change(screen.getByLabelText(/Adresse ou point de repère/i), { target: { value: "Rue 102, maison 14" } });

      fireEvent.click(screen.getByRole("button", { name: /Confirmer ·/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Le stock a changé depuis l'ajout au panier/i);
    });

    it("affiche un message d'erreur si la boutique est déconnectée (source !== 'api')", async () => {
      renderCheckout({ source: "local" });

      fireEvent.change(screen.getByLabelText(/Prénom et nom/i), { target: { value: "Murielle Yenou" } });
      fireEvent.change(screen.getByLabelText(/Téléphone/i), { target: { value: "+229 97 00 00 00" } });
      fireEvent.change(screen.getByLabelText(/Quartier/i), { target: { value: "Haie Vive" } });
      fireEvent.change(screen.getByLabelText(/Adresse ou point de repère/i), { target: { value: "Rue 102, maison 14" } });

      fireEvent.click(screen.getByRole("button", { name: /Confirmer ·/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Le service de commande est momentanément indisponible/i);
    });
  });

  describe("Critère 3 : Tests des règles de livraison côté interface", () => {
    it("applique par défaut 1 500 FCFA pour Cotonou quand le sous-total est inférieur à 50 000 FCFA", () => {
      renderCheckout({ subtotal: 38000 });

      // Sous-total 38 000 + Livraison Cotonou 1 500 = Total 39 500 FCFA
      expect(screen.getByText("Livraison (Cotonou)")).toBeInTheDocument();
      expect(screen.getByText("1 500 FCFA")).toBeInTheDocument();
      expect(screen.getByText("39 500 FCFA")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirmer · 39 500 FCFA" })).toBeInTheDocument();
    });

    it("recalcule instantanément la livraison à 3 000 FCFA lors du changement vers Porto-Novo ou Abomey-Calavi", () => {
      renderCheckout({ subtotal: 38000 });

      const citySelect = screen.getByLabelText(/Ville/i);
      fireEvent.change(citySelect, { target: { value: "Porto-Novo" } });

      // Sous-total 38 000 + Livraison 3 000 = Total 41 000 FCFA
      expect(screen.getByText("Livraison (Porto-Novo)")).toBeInTheDocument();
      expect(screen.getByText("3 000 FCFA")).toBeInTheDocument();
      expect(screen.getByText("41 000 FCFA")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirmer · 41 000 FCFA" })).toBeInTheDocument();
    });

    it("applique la gratuité (mention 'Offerte' et total = sous-total) dès 50 000 FCFA", () => {
      renderCheckout({ subtotal: 55000 });

      // Livraison offerte
      expect(screen.getByText("Livraison (Cotonou)")).toBeInTheDocument();
      expect(screen.getByText("Offerte")).toBeInTheDocument();
      expect(screen.getAllByText("55 000 FCFA").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("button", { name: "Confirmer · 55 000 FCFA" })).toBeInTheDocument();
    });

    it("utilise les zones dynamiques fournies par l'API shippingApi.zones", async () => {
      vi.spyOn(shippingApi, "zones").mockResolvedValue([
        { code: "parakou", name: "Parakou", fee_xof: 4000, free_shipping_threshold_xof: 70000 },
        { code: "cotonou", name: "Cotonou", fee_xof: 1200, free_shipping_threshold_xof: 45000 },
      ]);

      renderCheckout({ subtotal: 38000 });

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Parakou" })).toBeInTheDocument();
      });

      const citySelect = screen.getByLabelText(/Ville/i);
      fireEvent.change(citySelect, { target: { value: "Parakou" } });

      // Sous-total 38 000 + Livraison Parakou 4 000 = 42 000 FCFA
      expect(screen.getByText("Livraison (Parakou)")).toBeInTheDocument();
      expect(screen.getByText("4 000 FCFA")).toBeInTheDocument();
      expect(screen.getByText("42 000 FCFA")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirmer · 42 000 FCFA" })).toBeInTheDocument();
    });

    it("propose l'emballage neutre coché par défaut et modifiable", () => {
      renderCheckout();

      const checkbox = screen.getByLabelText(/Emballage neutre, sans logo ni description du contenu/i);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("Critère 4 : Formulaire Contact (validation, busy et notification)", () => {
    function renderContact() {
      return render(
        <MemoryRouter>
          <ShopContext.Provider value={{ openPanel: vi.fn() }}>
            <Contact />
          </ShopContext.Provider>
        </MemoryRouter>,
      );
    }

    it("valide les champs obligatoires du formulaire de contact", () => {
      renderContact();

      fireEvent.click(screen.getByRole("button", { name: /Envoyer mon message/i }));

      expect(screen.getByText(/Le nom est obligatoire/i)).toBeInTheDocument();
      expect(screen.getByText(/L'adresse e-mail est obligatoire/i)).toBeInTheDocument();
      expect(screen.getByText(/Le message est obligatoire/i)).toBeInTheDocument();
    });

    it("valide le format de l'e-mail dans le formulaire de contact", () => {
      renderContact();

      fireEvent.change(screen.getByPlaceholderText("Prénom ou nom"), { target: { value: "Murielle" } });
      fireEvent.change(screen.getByPlaceholderText("contact@exemple.com"), { target: { value: "contact-invalide" } });
      fireEvent.change(screen.getByPlaceholderText("Décrivez votre demande en toute liberté..."), { target: { value: "Besoin de conseil" } });

      fireEvent.click(screen.getByRole("button", { name: /Envoyer mon message/i }));
      expect(screen.getByText(/Format d'adresse e-mail invalide/i)).toBeInTheDocument();
    });

    it("affiche le message de confirmation avec role='status' après transmission du formulaire de contact", async () => {
      vi.useFakeTimers();

      renderContact();

      fireEvent.change(screen.getByPlaceholderText("Prénom ou nom"), { target: { value: "Murielle" } });
      fireEvent.change(screen.getByPlaceholderText("contact@exemple.com"), { target: { value: "murielle@example.com" } });
      fireEvent.change(screen.getByPlaceholderText("Décrivez votre demande en toute liberté..."), { target: { value: "Conseil sur la taille M" } });

      fireEvent.click(screen.getByRole("button", { name: /Envoyer mon message/i }));

      // Avancement du timer de 400ms avec re-render React
      act(() => {
        vi.advanceTimersByTime(500);
      });

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(/Votre message a été transmis avec succès/i);

      vi.useRealTimers();
    });
  });

  describe("Critère 5 : Composants ajoutés ou modifiés (CartDrawer & PageHead)", () => {
    it("affiche dans le panier le montant manquant pour atteindre la livraison offerte", () => {
      const mockShopValue = {
        panel: "cart",
        closePanel: vi.fn(),
        cart: [{ id: 1, key: "1-noir-M", color: "noir", size: "M", qty: 1 }],
        subtotal: 38000,
        changeQty: vi.fn(),
        removeItem: vi.fn(),
      };

      render(
        <MemoryRouter>
          <ShopContext.Provider value={mockShopValue}>
            <CartDrawer />
          </ShopContext.Provider>
        </MemoryRouter>,
      );

      // Seuil 50 000 - 38 000 = 12 000 FCFA restants
      expect(screen.getByText(/Plus que/i)).toBeInTheDocument();
      expect(screen.getByText("12 000 FCFA")).toBeInTheDocument();
      expect(screen.getByText(/pour la livraison offerte/i)).toBeInTheDocument();
    });

    it("affiche dans le panier la mention livraison offerte dès 50 000 FCFA", () => {
      const mockShopValue = {
        panel: "cart",
        closePanel: vi.fn(),
        cart: [{ id: 1, key: "1-noir-M", color: "noir", size: "M", qty: 2 }],
        subtotal: 76000,
        changeQty: vi.fn(),
        removeItem: vi.fn(),
      };

      render(
        <MemoryRouter>
          <ShopContext.Provider value={mockShopValue}>
            <CartDrawer />
          </ShopContext.Provider>
        </MemoryRouter>,
      );

      expect(screen.getByText("La livraison vous est offerte")).toBeInTheDocument();
    });

    it("permet d'augmenter, diminuer et retirer un article depuis le CartDrawer", () => {
      const changeQty = vi.fn();
      const removeItem = vi.fn();
      const mockShopValue = {
        panel: "cart",
        closePanel: vi.fn(),
        cart: [{ id: 1, key: "1-noir-M", color: "noir", size: "M", qty: 2 }],
        subtotal: 76000,
        changeQty,
        removeItem,
      };

      render(
        <MemoryRouter>
          <ShopContext.Provider value={mockShopValue}>
            <CartDrawer />
          </ShopContext.Provider>
        </MemoryRouter>,
      );

      const plusBtn = screen.getByRole("button", { name: /Augmenter la quantité/i });
      fireEvent.click(plusBtn);
      expect(changeQty).toHaveBeenCalledWith("1-noir-M", 1);

      const minusBtn = screen.getByRole("button", { name: /Diminuer la quantité/i });
      fireEvent.click(minusBtn);
      expect(changeQty).toHaveBeenCalledWith("1-noir-M", -1);

      const removeBtn = screen.getByRole("button", { name: /Retirer/i });
      fireEvent.click(removeBtn);
      expect(removeItem).toHaveBeenCalledWith("1-noir-M");
    });

    it("PageHead rend la hiérarchie de navigation (breadcrumbs) et le titre", () => {
      render(
        <MemoryRouter>
          <PageHead
            crumbs={[
              { to: "/", label: "Accueil" },
              { to: "/livraison", label: "Livraison" },
              { label: "Détails" },
            ]}
            title="Titre de la Page"
          >
            Sous-titre descriptif
          </PageHead>
        </MemoryRouter>,
      );

      expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
      expect(screen.getByRole("link", { name: "Livraison" })).toHaveAttribute("href", "/livraison");
      expect(screen.getByText(/Détails/i)).toBeInTheDocument();
      expect(screen.getByText("Titre de la Page")).toBeInTheDocument();
      expect(screen.getByText("Sous-titre descriptif")).toBeInTheDocument();
    });
  });
});

