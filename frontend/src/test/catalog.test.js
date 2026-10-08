import { describe, expect, it } from "vitest";
import { FREE_SHIPPING, formatPrice, getProduct, shippingFee } from "../data/catalog.js";

describe("catalogue", () => {
  it("retrouve un produit par identifiant", () => {
    expect(getProduct(1)?.name).toBe("Soutien-gorge Séraphine");
    expect(getProduct("1")?.id).toBe(1);
  });

  it("formate les montants en FCFA", () => {
    expect(formatPrice(38000)).toBe("38 000 FCFA");
  });

  it("applique les frais de livraison actuels", () => {
    expect(shippingFee("Cotonou", 40000)).toBe(1500);
    expect(shippingFee("Abomey-Calavi", 40000)).toBe(3000);
    expect(shippingFee("Cotonou", FREE_SHIPPING)).toBe(0);
  });
});
