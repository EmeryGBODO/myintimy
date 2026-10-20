import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { formatApiErrorMessage, ApiError } from "../api/errors.js";
import { AdminError, AdminLoading, AdminEmpty } from "../admin/AdminUI.jsx";
import { InlineError, InlineLoading } from "../components/Shared.jsx";
import AccountOrders from "../pages/account/AccountOrders.jsx";
import AccountLogin from "../pages/account/AccountLogin.jsx";
import { ClientProvider } from "../account/ClientProvider.jsx";
import { customerApi } from "../api/customer.js";

describe("Tâche 7 - Uniformisation des états UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("formatApiErrorMessage helper", () => {
    it("traduit les erreurs réseau en message clair en français", () => {
      const netError = new ApiError("Failed to fetch", { code: "NETWORK_ERROR" });
      const msg = formatApiErrorMessage(netError);
      expect(msg).toContain("Impossible de joindre");
      expect(msg).toContain("connexion Internet");
    });

    it("traduit les timeouts et requêtes annulées", () => {
      const timeoutError = new ApiError("Request timed out", { code: "REQUEST_ABORTED" });
      expect(formatApiErrorMessage(timeoutError)).toContain("délai d'attente a été dépassé");
    });

    it("affiche un message explicite en cas de mauvais mot de passe au lieu de session expirée", () => {
      const badPasswordError = new ApiError("E-mail ou mot de passe incorrect.", {
        status: 401,
        code: "INVALID_CUSTOMER_CREDENTIALS",
      });
      expect(formatApiErrorMessage(badPasswordError)).toBe("E-mail ou mot de passe incorrect.");

      const badAdminPassword = new ApiError("Email ou mot de passe incorrect.", {
        status: 401,
        code: "INVALID_ADMIN_CREDENTIALS",
      });
      expect(formatApiErrorMessage(badAdminPassword)).toBe("E-mail ou mot de passe incorrect.");
    });

    it("gère les statuts HTTP 401, 403, 404 et 500+", () => {
      expect(formatApiErrorMessage(new ApiError("Unauthorized", { status: 401 }))).toContain("session a expiré");
      expect(formatApiErrorMessage(new ApiError("Forbidden", { status: 403 }))).toContain("autorisation");
      expect(formatApiErrorMessage(new ApiError("Erreur HTTP 404", { status: 404 }))).toContain("introuvable");
      expect(formatApiErrorMessage(new ApiError("Internal Error", { status: 500 }))).toContain("difficulté technique");
    });

    it("ne renvoie jamais de stack trace technique brute", () => {
      const techError = new Error("Erreur HTTP 500\n    at Object.fetch (client.js:45:11)\n    at processTicks");
      const msg = formatApiErrorMessage(techError);
      expect(msg).not.toContain("at Object");
      expect(msg).not.toContain("client.js");
      expect(msg).toBe("Une erreur inattendue est survenue.");
    });

    it("préserve les messages métier explicites", () => {
      const bizError = new ApiError("Cet e-mail est déjà utilisé par un autre compte.");
      expect(formatApiErrorMessage(bizError)).toBe("Cet e-mail est déjà utilisé par un autre compte.");
    });
  });

  describe("Composants AdminError et InlineError avec retry", () => {
    it("AdminError affiche l'erreur et déclenche onRetry", () => {
      const onRetry = vi.fn();
      render(<AdminError error={new Error("Panne serveur temporaire")} onRetry={onRetry} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Panne serveur temporaire")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /réessayer/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("AdminError ne rend rien si l'erreur est null", () => {
      const { container } = render(<AdminError error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("InlineError affiche l'erreur et déclenche onRetry", () => {
      const onRetry = vi.fn();
      render(<InlineError error="Problème de connexion" onRetry={onRetry} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Problème de connexion")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /réessayer/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("Composants de chargement et d'absence de données", () => {
    it("AdminLoading affiche un état de chargement élégant", () => {
      render(<AdminLoading message="Chargement des commandes…" />);
      expect(screen.getByText("Chargement des commandes…")).toBeInTheDocument();
    });

    it("InlineLoading affiche un spinner avec message", () => {
      render(<InlineLoading message="Veuillez patienter…" />);
      expect(screen.getByText("Veuillez patienter…")).toBeInTheDocument();
    });

    it("AdminEmpty affiche le message et l'action optionnelle", () => {
      render(
        <AdminEmpty action={<button type="button">Créer</button>}>
          Aucun élément trouvé.
        </AdminEmpty>,
      );
      expect(screen.getByText("Aucun élément trouvé.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
    });
  });

  describe("Écran AccountOrders (états loading, error, empty, retry)", () => {
    it("affiche l'indicateur de chargement puis le message vide sans flash", async () => {
      let resolveOrders;
      const ordersPromise = new Promise((resolve) => {
        resolveOrders = resolve;
      });
      vi.spyOn(customerApi.orders, "list").mockReturnValue(ordersPromise);

      render(
        <BrowserRouter>
          <AccountOrders />
        </BrowserRouter>,
      );

      // Pendant la requête : chargement visible, état vide pas encore affiché
      expect(screen.getByText(/chargement de vos commandes/i)).toBeInTheDocument();
      expect(screen.queryByText(/aucune commande pour le moment/i)).not.toBeInTheDocument();

      // Résolution avec liste vide
      resolveOrders([]);
      await waitFor(() => {
        expect(screen.getByText(/aucune commande pour le moment/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/chargement de vos commandes/i)).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: /découvrir le catalogue/i })).toBeInTheDocument();
    });

    it("propose un bouton de nouvelle tentative (retry) en cas d'échec", async () => {
      const listSpy = vi
        .spyOn(customerApi.orders, "list")
        .mockRejectedValueOnce(new ApiError("Impossible de joindre le serveur", { code: "NETWORK_ERROR" }))
        .mockResolvedValueOnce([
          {
            id: "ord-1",
            reference: "MYI-2026-TEST",
            created_at: "2026-10-20T10:00:00Z",
            status: "confirmed",
            total_xof: 35000,
          },
        ]);

      render(
        <BrowserRouter>
          <AccountOrders />
        </BrowserRouter>,
      );

      // Attente de l'erreur avec bouton Réessayer
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      const retryBtn = screen.getByRole("button", { name: /réessayer/i });
      expect(retryBtn).toBeInTheDocument();

      // Clic sur Réessayer -> la deuxième requête réussit
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText("MYI-2026-TEST")).toBeInTheDocument();
        expect(screen.getByText("35 000 FCFA")).toBeInTheDocument();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(listSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Écran AccountLogin", () => {
    it("affiche un message explicite d'identifiants incorrects en cas de 401 au lieu d'une session expirée", async () => {
      vi.spyOn(customerApi, "profile").mockResolvedValue(null);
      vi.spyOn(customerApi, "login").mockRejectedValue(
        new ApiError("E-mail ou mot de passe incorrect.", {
          status: 401,
          code: "INVALID_CUSTOMER_CREDENTIALS",
        }),
      );

      render(
        <BrowserRouter>
          <ClientProvider>
            <AccountLogin />
          </ClientProvider>
        </BrowserRouter>,
      );

      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "test@example.com" } });
      fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: "wrongpwd" } });
      fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou mot de passe incorrect.");
      });
      expect(screen.queryByText(/session a expiré/i)).not.toBeInTheDocument();
    });
  });
});
