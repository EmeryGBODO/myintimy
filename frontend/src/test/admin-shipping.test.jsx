import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminShipping from "../pages/admin/AdminShipping.jsx";
import { adminApi } from "../api/admin.js";

const mockZones = [
  {
    id: "zone-1",
    name: "Cotonou",
    code: "cotonou",
    fee_xof: 1500,
    free_shipping_threshold_xof: 50000,
    is_active: true,
    display_order: 1,
    created_at: "2026-10-19T10:00:00Z",
    updated_at: "2026-10-19T10:00:00Z",
  },
  {
    id: "zone-2",
    name: "Parakou",
    code: "parakou",
    fee_xof: 4000,
    free_shipping_threshold_xof: null,
    is_active: false,
    display_order: 6,
    created_at: "2026-10-19T10:00:00Z",
    updated_at: "2026-10-19T10:00:00Z",
  },
];

describe("AdminShipping Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("affiche la liste des zones et les statistiques", async () => {
    vi.spyOn(adminApi, "shippingZones").mockResolvedValue(mockZones);

    render(<AdminShipping />);

    // Attente du chargement des zones (desktop + mobile)
    await waitFor(() => {
      expect(screen.getAllByText("Cotonou").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Parakou").length).toBeGreaterThan(0);
    });

    // Vérification des tarifs et statuts
    expect(screen.getAllByText("1 500 FCFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4 000 FCFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dès 50 000 FCFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jamais offerte").length).toBeGreaterThan(0);
  });

  it("permet d'activer ou désactiver une zone directement", async () => {
    vi.spyOn(adminApi, "shippingZones").mockResolvedValue(mockZones);
    const updateSpy = vi.spyOn(adminApi, "updateShippingZone").mockResolvedValue({
      ...mockZones[0],
      is_active: false,
    });

    render(<AdminShipping />);

    await waitFor(() => {
      expect(screen.getAllByText("Cotonou").length).toBeGreaterThan(0);
    });

    // Clic sur "Désactiver" pour Cotonou (desktop)
    const deactivateButtons = screen.getAllByRole("button", { name: "Désactiver" });
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("zone-1", { is_active: false });
    });
  });

  it("remplit le formulaire lors du clic sur Modifier", async () => {
    vi.spyOn(adminApi, "shippingZones").mockResolvedValue(mockZones);

    render(<AdminShipping />);

    await waitFor(() => {
      expect(screen.getAllByText("Cotonou").length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole("button", { name: "Modifier" });
    fireEvent.click(editButtons[0]);

    // Le titre du formulaire bascule en mode édition
    expect(screen.getByText("Modifier « Cotonou »")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cotonou")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1500")).toBeInTheDocument();
  });

  it("soumet la création d'une nouvelle zone avec ses paramètres", async () => {
    vi.spyOn(adminApi, "shippingZones").mockResolvedValue(mockZones);
    const createSpy = vi.spyOn(adminApi, "createShippingZone").mockResolvedValue({
      id: "zone-3",
      name: "Grand-Popo",
      code: "grand-popo",
      fee_xof: 3500,
      free_shipping_threshold_xof: 60000,
      is_active: true,
      display_order: 10,
    });

    render(<AdminShipping />);

    await waitFor(() => {
      expect(screen.getAllByText("Cotonou").length).toBeGreaterThan(0);
    });

    const nameInput = screen.getByPlaceholderText("Nom de la ville ou zone");
    const feeInput = screen.getByPlaceholderText("1500");
    const submitBtn = screen.getByRole("button", { name: "Créer la zone" });

    fireEvent.change(nameInput, { target: { value: "Grand-Popo" } });
    fireEvent.change(feeInput, { target: { value: "3500" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Grand-Popo",
          fee_xof: 3500,
          is_active: true,
        }),
      );
    });
  });
});
