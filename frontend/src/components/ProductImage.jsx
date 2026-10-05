import { useMemo } from "react";
import { artSvg } from "../data/art.js";

/** Affiche la vraie photo si `product.images` existe, sinon l'illustration provisoire. */
export default function ProductImage({ product, color, variant = 0, className = "" }) {
  const svg = useMemo(() => (product.images ? null : artSvg(product, color, variant)), [product, color, variant]);
  if (product.images) {
    const src = product.images[variant] || product.images[0];
    return <img src={src} alt={product.name} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return <div className={`art h-full w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
