import { getProduct } from "../data/catalog.js";

export const createCartKey = (id, color, size) => `${id}|${color}|${size || ""}`;

export function addCartItem(cart, id, color, size, qty = 1) {
  const key = createCartKey(id, color, size);
  const quantity = Number(qty);
  if (!Number.isFinite(quantity) || quantity <= 0) return cart;
  return cart.some((item) => item.key === key)
    ? cart.map((item) => (item.key === key ? { ...item, qty: item.qty + quantity } : item))
    : [...cart, { key, id, color, size, qty: quantity }];
}

export function changeCartItemQty(cart, key, delta) {
  return cart
    .map((item) => (item.key === key ? { ...item, qty: item.qty + delta } : item))
    .filter((item) => item.qty > 0);
}

export const removeCartItem = (cart, key) => cart.filter((item) => item.key !== key);

export function calculateSubtotal(cart, productResolver = getProduct) {
  return cart.reduce((total, item) => total + (productResolver(item.id)?.price || 0) * item.qty, 0);
}
