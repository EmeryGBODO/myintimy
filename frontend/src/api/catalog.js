import { resolveBackendUrl } from "../config/env.js";
import { api } from "./client.js";

export function resolveMediaUrl(url) {
  return url ? resolveBackendUrl(url) : null;
}

export function normalizeApiProduct(product) {
  const publicId = product.public_id ?? product.slug ?? product.id;
  const numericId = typeof publicId === "string" && /^\d+$/.test(publicId) ? Number(publicId) : publicId;
  const images = (product.images || []).map((image) => resolveMediaUrl(image.url)).filter(Boolean);
  return {
    id: numericId,
    backendId: product.id,
    legacyId: product.legacy_id ?? null,
    slug: product.slug,
    category: product.category?.slug,
    type: product.type,
    name: product.name,
    price: product.price_xof,
    colors: (product.colors || []).map((color) => color.slug),
    sizes: product.sizes?.length ? product.sizes.map((size) => size.code) : null,
    tag: product.tag || undefined,
    isNew: Boolean(product.is_new),
    description: product.description,
    material: product.material,
    images: images.length ? images : undefined,
    variants: product.variants || [],
    inStock: Boolean(product.in_stock),
  };
}

export function normalizeApiCategories(categories) {
  return Object.fromEntries((categories || []).map((category) => [category.slug, {
    id: category.id,
    title: category.title,
    subtitle: category.subtitle,
    displayOrder: category.display_order,
  }]));
}

export async function fetchCatalog({ signal } = {}) {
  const [productsPayload, categoriesPayload] = await Promise.all([
    api.get("products?limit=200", { signal }),
    api.get("categories", { signal }),
  ]);
  return {
    products: (productsPayload.items || []).map(normalizeApiProduct),
    categories: normalizeApiCategories(categoriesPayload),
  };
}
