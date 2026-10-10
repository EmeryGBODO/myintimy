import { useEffect, useMemo, useState } from "react";
import { artSvg } from "../data/art.js";

/** Affiche la vraie photo si disponible, sinon l’illustration provisoire Myintimy. */
export default function ProductImage({ product, color, variant = 0, className = "" }) {
  const hasImages = Boolean(product?.images?.length);
  const src = hasImages ? (product.images[variant] || product.images[0]) : null;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [src]);

  const svg = useMemo(
    () => (product && (!src || imageFailed) ? artSvg(product, color, variant) : null),
    [product, color, variant, src, imageFailed],
  );

  if (!product) return <div className={`h-full w-full bg-surface ${className}`} aria-hidden="true" />;

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return <div className={`art h-full w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
