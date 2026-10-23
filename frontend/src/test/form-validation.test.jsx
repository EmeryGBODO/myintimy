import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  isValidEmail,
  isValidPhone,
  validateEmailField,
  validatePhoneField,
  validatePasswordField,
  validateRequiredField,
  validatePositiveInt,
  validateHexColor,
} from "../utils/validation.js";
import { extractFieldErrors, ApiError } from "../api/errors.js";
import { ClientProvider } from "../account/ClientProvider.jsx";
import AccountRegister from "../pages/account/AccountRegister.jsx";
import AccountLogin from "../pages/account/AccountLogin.jsx";
import AccountAddresses from "../pages/account/AccountAddresses.jsx";
import AdminShipping from "../pages/admin/AdminShipping.jsx";
import { customerApi } from "../api/customer.js";
import { adminApi } from "../api/admin.js";

describe("Tâche 8 — Renforcer la validation des formulaires", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Utilitaires de validation (validation.js)", () => {
    it("contrôle rigoureusement les formats e-mail", () => {
      expect(isValidEmail("client@myintimy.com")).toBe(true);
      expect(isValidEmail("a.b+tag@domaine.co")).toBe(true);
      expect(isValidEmail("invalide")).toBe(false);
      expect(isValidEmail("invalide@")).toBe(false);
      expect(isValidEmail("@domaine.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);

      expect(validateEmailField("client@domaine.com")).toBeNull();
      expect(validateEmailField("mauvais-email")).toContain("Format d'adresse e-mail invalide");
      expect(validateEmailField("", { required: false })).toBeNull();
      expect(validateEmailField("", { required: true })).toContain("obligatoire");
    });

    it("contrôle les formats téléphone (format béninois & international, 5 à 20 chiffres)", () => {
      expect(isValidPhone("+229 97 00 00 00")).toBe(true);
      expect(isValidPhone("0197000000")).toBe(true);
      expect(isValidPhone("+33 6 12 34 56 78")).toBe(true);
      expect(isValidPhone("1234")).toBe(false); // moins de 5 chiffres
      expect(isValidPhone("abc-def-ghij")).toBe(false); // lettres interdites

      expect(validatePhoneField("+229 97 00 00 00")).toBeNull();
      expect(validatePhoneField("12")).toContain("Numéro de téléphone invalide");
      expect(validatePhoneField("", { required: false })).toBeNull();
      expect(validatePhoneField("", { required: true })).toContain("obligatoire");
    });

    it("vérifie les mots de passe d'au moins 10 caractères", () => {
      expect(validatePasswordField("Court123")).toContain("au moins 10 caractères");
      expect(validatePasswordField("LongMotDePasse123!")).toBeNull();
    });

    it("vérifie les champs obligatoires", () => {
      expect(validateRequiredField("", "Le prénom")).toBe("Le prénom est obligatoire.");
      expect(validateRequiredField("   ", "Le champ")).toBe("Le champ est obligatoire.");
      expect(validateRequiredField("Murielle", "Le prénom")).toBeNull();
    });

    it("contrôle les montants et quantités entières positives", () => {
      expect(validatePositiveInt(1500, "Le tarif")).toBeNull();
      expect(validatePositiveInt(0, "Le tarif")).toBeNull();
      expect(validatePositiveInt(-500, "Le tarif")).toContain("positif ou nul");
      expect(validatePositiveInt("abc", "Le tarif")).toContain("positif ou nul");
      expect(validatePositiveInt(12.5, "Le tarif")).toContain("entier");
    });

    it("contrôle les couleurs hexadécimales", () => {
      expect(validateHexColor("#FF0000")).toBeNull();
      expect(validateHexColor("#abcdef")).toBeNull();
      expect(validateHexColor("rouge")).toContain("hexadécimal (#RRGGBB)");
      expect(validateHexColor("#12345")).toContain("hexadécimal (#RRGGBB)");
    });
  });

  describe("Extraction d'erreurs par champ (extractFieldErrors)", () => {
    it("extrait les erreurs de validation FastAPI / Pydantic v2", () => {
      const pydanticError = new ApiError("Données invalides", {
        status: 422,
        code: "VALIDATION_ERROR",
        details: [
          { loc: ["body", "email"], msg: "Format d'adresse e-mail invalide." },
          { loc: ["body", "password"], msg: "Ce champ doit comporter au moins 10 caractères." },
        ],
      });

      const extracted = extractFieldErrors(pydanticError);
      expect(extracted).toEqual({
        email: "Format d'adresse e-mail invalide.",
        password: "Ce champ doit comporter au moins 10 caractères.",
      });
    });

    it("gère les détails sous forme d'objet simple", () => {
      const error = new ApiError("Erreur", {
        details: { phone: "Numéro de téléphone invalide." },
      });
      expect(extractFieldErrors(error)).toEqual({
        phone: "Numéro de téléphone invalide.",
      });
    });

    it("renvoie un objet vide quand aucune erreur par champ n'est présente", () => {
      expect(extractFieldErrors(null)).toEqual({});
      expect(extractFieldErrors(new ApiError("Erreur générale"))).toEqual({});
    });
  });

  describe("Formulaire AccountRegister", () => {
    it("identifie les champs obligatoires avec des astérisques et signale les erreurs sous chaque champ", async () => {
      render(
        <BrowserRouter>
          <ClientProvider>
            <AccountRegister />
          </ClientProvider>
        </BrowserRouter>,
      );

      // Présence des indicateurs obligatoires *
      expect(screen.getByText(/Prénom et nom/)).toHaveTextContent("*");
      expect(screen.getByText(/E-mail/)).toHaveTextContent("*");
      expect(screen.getByText(/Confirmation/)).toHaveTextContent("*");

      // Clic sans rien remplir
      const submitBtn = screen.getByRole("button", { name: "Créer mon compte" });
      fireEvent.click(submitBtn);

      // Les messages d'erreur sont affichés sous les champs concernés
      await waitFor(() => {
        expect(screen.getByText("Le prénom et nom est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("L'adresse e-mail est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("Le mot de passe doit contenir au moins 10 caractères.")).toBeInTheDocument();
      });
    });

    it("contrôle le format du téléphone et la concordance des mots de passe", async () => {
      render(
        <BrowserRouter>
          <ClientProvider>
            <AccountRegister />
          </ClientProvider>
        </BrowserRouter>,
      );

      const nameInput = screen.getByLabelText(/Prénom et nom/i);
      const emailInput = screen.getByLabelText(/^E-mail/i);
      const phoneInput = screen.getByLabelText(/Téléphone/i);
      const passInputs = screen.getAllByLabelText(/Mot de passe|Confirmation/i);

      fireEvent.change(nameInput, { target: { value: "Murielle Test" } });
      fireEvent.change(emailInput, { target: { value: "murielle@example.com" } });
      fireEvent.change(phoneInput, { target: { value: "123" } }); // Invalide
      fireEvent.change(passInputs[0], { target: { value: "SuperMotDePasse123!" } });
      fireEvent.change(passInputs[1], { target: { value: "AutreMotDePasse" } }); // Ne correspond pas

      const submitBtn = screen.getByRole("button", { name: "Créer mon compte" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Numéro de téléphone invalide/)).toBeInTheDocument();
        expect(screen.getByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
      });
    });
  });

  describe("Formulaire AccountLogin", () => {
    it("affiche les indicateurs obligatoires et valide les champs à la soumission", async () => {
      render(
        <BrowserRouter>
          <ClientProvider>
            <AccountLogin />
          </ClientProvider>
        </BrowserRouter>,
      );

      expect(screen.getByText(/E-mail/)).toHaveTextContent("*");
      expect(screen.getAllByText(/Mot de passe/)[0]).toHaveTextContent("*");

      const submitBtn = screen.getByRole("button", { name: "Se connecter" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("L'adresse e-mail est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("Le mot de passe est obligatoire.")).toBeInTheDocument();
      });
    });
  });

  describe("Formulaire AccountAddresses", () => {
    it("identifie les champs requis et valide le numéro de téléphone", async () => {
      vi.spyOn(customerApi.addresses, "list").mockResolvedValue([]);

      render(
        <BrowserRouter>
          <ClientProvider>
            <AccountAddresses />
          </ClientProvider>
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Destinataire/)).toHaveTextContent("*");
      });

      const submitBtn = screen.getByRole("button", { name: "Ajouter l'adresse" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Le nom du destinataire est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("Le numéro de téléphone est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("Le quartier est obligatoire.")).toBeInTheDocument();
        expect(screen.getByText("L'adresse est obligatoire.")).toBeInTheDocument();
      });
    });
  });

  describe("Formulaire AdminShipping", () => {
    it("refuse les tarifs et montants invalides avec messages explicites", async () => {
      vi.spyOn(adminApi, "shippingZones").mockResolvedValue([]);

      render(
        <BrowserRouter>
          <AdminShipping />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Tarif d'expédition/)).toHaveTextContent("*");
      });

      const nameInput = screen.getByPlaceholderText("Nom de la ville ou zone");
      const feeInput = screen.getByPlaceholderText("1500");
      const submitBtn = screen.getByRole("button", { name: "Créer la zone" });

      // Saisie d'un nom trop court et d'un tarif négatif
      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.change(feeInput, { target: { value: "-500" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Le nom de la zone doit comporter au moins 2 caractères.")).toBeInTheDocument();
        expect(screen.getByText(/doit être un nombre entier positif ou nul/)).toBeInTheDocument();
      });
    });
  });
});

