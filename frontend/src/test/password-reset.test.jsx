import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForgotPassword, ResetPassword } from "../pages/account/AccountPassword.jsx";
import { customerApi } from "../api/customer.js";
import { ApiError } from "../api/errors.js";

describe("Tâche 13 — Tests du reset password (ForgotPassword & ResetPassword)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Composant ForgotPassword (Demande de réinitialisation)", () => {
    it("affiche le formulaire avec un label accessible, placeholder et astérisque obligatoire", () => {
      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Retrouver votre/i)).toBeInTheDocument();
      const emailInput = screen.getByPlaceholderText("votre.email@exemple.com");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute("type", "email");
      expect(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i })).toBeInTheDocument();
    });

    it("valide que l'adresse e-mail est obligatoire et signale l'erreur sous le champ", async () => {
      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/L'adresse e-mail est obligatoire/i);
      expect(screen.getByPlaceholderText("votre.email@exemple.com")).toHaveAttribute("aria-invalid", "true");
    });

    it("valide la syntaxe de l'adresse e-mail et signale un format invalide", async () => {
      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      const emailInput = screen.getByPlaceholderText("votre.email@exemple.com");
      fireEvent.change(emailInput, { target: { value: "adresse-sans-domaine" } });
      fireEvent.click(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Format d'adresse e-mail invalide/i);

      // La saisie d'un nouveau caractère efface l'erreur
      fireEvent.change(emailInput, { target: { value: "adresse-sans-domaine@" } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("gère l'état de chargement busy et désactive le bouton lors de la soumission", async () => {
      let resolveApi;
      const apiPromise = new Promise((resolve) => {
        resolveApi = resolve;
      });
      vi.spyOn(customerApi, "requestPasswordReset").mockReturnValue(apiPromise);

      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      const emailInput = screen.getByPlaceholderText("votre.email@exemple.com");
      fireEvent.change(emailInput, { target: { value: "marianne@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i }));

      // Pendant la requête : libellé de chargement et bouton désactivé
      const busyBtn = screen.getByRole("button", { name: /Envoi du lien en cours…/i });
      expect(busyBtn).toBeDisabled();
      expect(emailInput).toBeDisabled();

      // Résolution
      resolveApi({ message: "OK" });
      await waitFor(() => {
        expect(screen.getByText(/Vérifiez votre boîte de réception/i)).toBeInTheDocument();
      });
    });

    it("affiche le message de confirmation avec l'adresse e-mail après soumission réussie", async () => {
      vi.spyOn(customerApi, "requestPasswordReset").mockResolvedValue({ message: "OK" });

      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("votre.email@exemple.com"), {
        target: { value: "clara.dupont@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i }));

      await waitFor(() => {
        expect(screen.getByText(/Vérifiez votre boîte de réception/i)).toBeInTheDocument();
      });
      expect(screen.getByText("clara.dupont@example.com")).toBeInTheDocument();
      expect(screen.getByText(/valable 30 minutes/i)).toBeInTheDocument();
    });

    it("affiche l'encadré de développement si un development_token est renvoyé", async () => {
      vi.spyOn(customerApi, "requestPasswordReset").mockResolvedValue({
        message: "OK",
        development_token: "dev-test-token-12345",
      });

      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("votre.email@exemple.com"), {
        target: { value: "dev@myintimy.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i }));

      await waitFor(() => {
        expect(screen.getByText(/Mode développement actif/i)).toBeInTheDocument();
      });
      const devLink = screen.getByRole("link", { name: /Tester directement le lien de réinitialisation/i });
      expect(devLink).toHaveAttribute("href", "/compte/reinitialiser?token=dev-test-token-12345");
    });

    it("permet de recommencer avec une autre adresse via le bouton dédié", async () => {
      vi.spyOn(customerApi, "requestPasswordReset").mockResolvedValue({ message: "OK" });

      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("votre.email@exemple.com"), {
        target: { value: "premiere@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i }));

      await waitFor(() => {
        expect(screen.getByText(/Vérifiez votre boîte de réception/i)).toBeInTheDocument();
      });

      const resetBtn = screen.getByRole("button", { name: /Renvoyer avec une autre adresse/i });
      fireEvent.click(resetBtn);

      expect(screen.getByPlaceholderText("votre.email@exemple.com")).toBeInTheDocument();
      expect(screen.queryByText(/Vérifiez votre boîte de réception/i)).not.toBeInTheDocument();
    });

    it("affiche un message d'erreur si l'API échoue", async () => {
      vi.spyOn(customerApi, "requestPasswordReset").mockRejectedValue(
        new ApiError("Serveur temporairement indisponible", { status: 503 }),
      );

      render(
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("votre.email@exemple.com"), {
        target: { value: "test@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Recevoir le lien de réinitialisation/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText(/difficulté technique/i)).toBeInTheDocument();
    });
  });

  describe("Composant ResetPassword (Nouveau mot de passe)", () => {
    it("affiche un message explicite et un bouton de redirection si le jeton est manquant", () => {
      render(
        <MemoryRouter initialEntries={["/compte/reinitialiser"]}>
          <ResetPassword />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Lien manquant ou incomplet/i)).toBeInTheDocument();
      expect(screen.getByText(/Aucun jeton de réinitialisation n'a été détecté/i)).toBeInTheDocument();

      const link = screen.getByRole("link", { name: /Demander un nouveau lien/i });
      expect(link).toHaveAttribute("href", "/compte/mot-de-passe-oublie");
    });

    it("affiche le formulaire de saisie lorsque le token est présent dans l'URL", () => {
      render(
        <MemoryRouter initialEntries={["/compte/reinitialiser?token=valid-secret-token"]}>
          <ResetPassword />
        </MemoryRouter>,
      );

      expect(screen.getByPlaceholderText("10 caractères minimum")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Répétez votre mot de passe")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Enregistrer le nouveau mot de passe/i })).toBeInTheDocument();
    });

    it("valide que le mot de passe doit comporter au moins 10 caractères", async () => {
      render(
        <MemoryRouter initialEntries={["/compte/reinitialiser?token=valid-token"]}>
          <ResetPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("10 caractères minimum"), {
        target: { value: "court" },
      });
      fireEvent.change(screen.getByPlaceholderText("Répétez votre mot de passe"), {
        target: { value: "court" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Enregistrer le nouveau mot de passe/i }));

      const alerts = await screen.findAllByRole("alert");
      expect(alerts[0]).toHaveTextContent(/au moins 10 caractères/i);
    });

    it("valide que la confirmation de mot de passe doit concorder avec le nouveau mot de passe", async () => {
      render(
        <MemoryRouter initialEntries={["/compte/reinitialiser?token=valid-token"]}>
          <ResetPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("10 caractères minimum"), {
        target: { value: "SecretPassword123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Répétez votre mot de passe"), {
        target: { value: "DifferentPassword456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Enregistrer le nouveau mot de passe/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Les mots de passe ne correspondent pas/i);
    });

    it("affiche l'état de chargement lors de la réinitialisation", async () => {
      let resolveApi;
      const apiPromise = new Promise((resolve) => {
        resolveApi = resolve;
      });
      vi.spyOn(customerApi, "confirmPasswordReset").mockReturnValue(apiPromise);

      render(
        <MemoryRouter initialEntries={["/compte/reinitialiser?token=valid-token"]}>
          <ResetPassword />
        </MemoryRouter>,
      );

      const passInput = screen.getByPlaceholderText("10 caractères minimum");
      const confirmInput = screen.getByPlaceholderText("Répétez votre mot de passe");

      fireEvent.change(passInput, { target: { value: "NouveauMotDePasse2026" } });
      fireEvent.change(confirmInput, { target: { value: "NouveauMotDePasse2026" } });
      fireEvent.click(screen.getByRole("button", { name: /Enregistrer le nouveau mot de passe/i }));

      const busyBtn = screen.getByRole("button", { name: /Enregistrement en cours…/i });
      expect(busyBtn).toBeDisabled();
      expect(passInput).toBeDisabled();
      expect(confirmInput).toBeDisabled();

      resolveApi({ message: "Password updated" });
      await waitFor(() => {
        expect(screen.getByText(/Mot de passe réinitialisé avec succès !/i)).toBeInTheDocument();
      });
    });

    it("affiche l'écran de succès et le lien de connexion en cas de succès", async () => {
      vi.spyOn(customerApi, "confirmPasswordReset").mockResolvedValue({ message: "Password updated" });

      render(
        <MemoryRouter initialEntries={["/compte/reinitialiser?token=valid-token"]}>
          <ResetPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("10 caractères minimum"), {
        target: { value: "NouveauMotDePasse2026" },
      });
      fireEvent.change(screen.getByPlaceholderText("Répétez votre mot de passe"), {
        target: { value: "NouveauMotDePasse2026" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Enregistrer le nouveau mot de passe/i }));

      await waitFor(() => {
        expect(screen.getByText(/Mot de passe réinitialisé avec succès !/i)).toBeInTheDocument();
      });
      const loginLink = screen.getByRole("link", { name: /Se connecter à mon compte/i });
      expect(loginLink).toHaveAttribute("href", "/compte/connexion");
    });

    it("affiche un message d'erreur et un lien vers une nouvelle demande si le lien est expiré", async () => {
      vi.spyOn(customerApi, "confirmPasswordReset").mockRejectedValue(
        new ApiError("Le lien est expiré ou a déjà été utilisé.", { status: 400 }),
      );

      render(
        <MemoryRouter initialEntries={["/compte/reinitialiser?token=expired-token"]}>
          <ResetPassword />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByPlaceholderText("10 caractères minimum"), {
        target: { value: "NouveauMotDePasse2026" },
      });
      fireEvent.change(screen.getByPlaceholderText("Répétez votre mot de passe"), {
        target: { value: "NouveauMotDePasse2026" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Enregistrer le nouveau mot de passe/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/Le lien est expiré ou a déjà été utilisé/i);
      });
      const retryLink = screen.getByRole("link", { name: /Demander un nouveau lien de réinitialisation/i });
      expect(retryLink).toHaveAttribute("href", "/compte/mot-de-passe-oublie");
    });
  });
});

