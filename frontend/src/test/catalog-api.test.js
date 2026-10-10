import { describe, expect, it } from "vitest";
import { normalizeApiCategories, normalizeApiProduct } from "../api/catalog.js";

describe("normalisation du catalogue API", () => {
  it("convertit un produit backend vers le modèle utilisé par le frontend", () => {
    const product = normalizeApiProduct({
      id: "backend-uuid",
      legacy_id: 1,
      public_id: "1",
      slug: "seraphine",
      category: { slug: "lingerie" },
      type: "bra",
      name: "Séraphine",
      price_xof: 38000,
      colors: [{ slug: "noir" }],
      sizes: [{ code: "M" }],
      is_new: true,
      description: "Description",
      material: "Matière",
      images: [{ url: "/media/1.jpg" }],
      variants: [{ sku: "MYI-001-NOIR-M", in_stock: true }],
      in_stock: true,
    });

    expect(product.id).toBe(1);
    expect(product.backendId).toBe("backend-uuid");
    expect(product.category).toBe("lingerie");
    expect(product.price).toBe(38000);
    expect(product.colors).toEqual(["noir"]);
    expect(product.sizes).toEqual(["M"]);
    expect(product.images).toEqual(["http://localhost:8000/media/1.jpg"]);
    expect(product.inStock).toBe(true);
  });

  it("indexe les catégories par slug", () => {
    expect(normalizeApiCategories([{ id: "1", slug: "nuit", title: "Nuit", subtitle: "Doux", display_order: 2 }])).toEqual({
      nuit: { id: "1", title: "Nuit", subtitle: "Doux", displayOrder: 2 },
    });
  });
});
