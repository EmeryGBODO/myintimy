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

export function getCartItemUnitPrice(product, item) {
  if (!product) return 0;
  const variant = (product.variants || []).find((candidate) => {
    const color = candidate.color?.slug || candidate.color_slug;
    const size = candidate.size?.code || candidate.size_code || null;
    return color === item.color && size === (item.size || null);
  });
  return variant?.price_xof ?? product.price ?? 0;
}

export function calculateSubtotal(cart, productResolver = getProduct) {
  return cart.reduce((total, item) => {
    const product = productResolver(item.id);
    return total + getCartItemUnitPrice(product, item) * item.qty;
  }, 0);
}
