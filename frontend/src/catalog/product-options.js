import { COLORS } from "../data/catalog.js";

export function getProductColorMeta(product, slug) {
  const detail = product?.colorDetails?.find((color) => color.slug === slug);
  const fallback = COLORS[slug];

  return {
    slug,
    name: detail?.name || fallback?.n || slug,
    hex: detail?.hex_value || fallback?.h || "transparent",
  };
}
