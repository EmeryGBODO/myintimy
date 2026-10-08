import { describe, expect, it } from "vitest";
import { addCartItem, calculateSubtotal, changeCartItemQty, createCartKey, removeCartItem } from "../domain/cart.js";

describe("panier", () => {
  it("construit une clé à partir du produit, de la couleur et de la taille", () => {
    expect(createCartKey(1, "noir", "M")).toBe("1|noir|M");
  });

  it("ajoute et fusionne une même variante", () => {
    let cart = addCartItem([], 1, "noir", "M", 1);
    cart = addCartItem(cart, 1, "noir", "M", 2);
    expect(cart).toEqual([{ key: "1|noir|M", id: 1, color: "noir", size: "M", qty: 3 }]);
  });

  it("supprime une ligne quand sa quantité tombe à zéro", () => {
    const cart = [{ key: "1|noir|M", id: 1, color: "noir", size: "M", qty: 1 }];
    expect(changeCartItemQty(cart, "1|noir|M", -1)).toEqual([]);
  });

  it("retire une ligne explicitement", () => {
    const cart = [{ key: "1|noir|M", id: 1, color: "noir", size: "M", qty: 1 }];
    expect(removeCartItem(cart, "1|noir|M")).toEqual([]);
  });

  it("calcule le sous-total", () => {
    const cart = [
      { key: "1|noir|M", id: 1, color: "noir", size: "M", qty: 2 },
      { key: "2|rose|S", id: 2, color: "rose", size: "S", qty: 1 },
    ];
    expect(calculateSubtotal(cart)).toBe(92000);
  });
});
