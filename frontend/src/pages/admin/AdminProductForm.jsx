import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi, mediaUrl } from "../../api/admin.js";
import { extractFieldErrors } from "../../api/errors.js";
import { validatePositiveInt, validateRequiredField } from "../../utils/validation.js";
import {
  AdminCard,
  AdminError,
  AdminLoading,
  AdminStatus,
  AdminTitle,
  buttonClass,
  compactButtonClass,
  dangerButtonClass,
  fileInputClass,
  ghostButtonClass,
  inputClass,
} from "../../admin/AdminUI.jsx";
import { formatXof } from "../../admin/format.js";

const EMPTY_PRODUCT = {
  category_id: "",
  name: "",
  slug: "",
  type: "",
  price_xof: "",
  tag: "",
  is_new: false,
  description: "",
  material: "",
  is_active: true,
};

const EMPTY_VARIANT = {
  color_id: "",
  size_id: "",
  sku: "",
  price_xof: "",
  initial_stock: 0,
  is_active: true,
};

export default function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [variant, setVariant] = useState(EMPTY_VARIANT);
  const [productErrors, setProductErrors] = useState({});
  const [variantErrors, setVariantErrors] = useState({});
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [variantEdit, setVariantEdit] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageAlt, setImageAlt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function reloadProduct(productId = id) {
    if (!productId) return;
    const current = await adminApi.product(productId);
    setProduct(current);
    setForm({
      category_id: current.category.id,
      name: current.name,
      slug: current.slug,
      type: current.type,
      price_xof: current.price_xof,
      tag: current.tag || "",
      is_new: current.is_new,
      description: current.description || "",
      material: current.material || "",
      is_active: current.is_active,
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const [categoryItems, colorItems, sizeItems] = await Promise.all([
          adminApi.categories(),
          adminApi.colors(),
          adminApi.sizes(),
        ]);

        setCategories(categoryItems);
        setColors(colorItems);
        setSizes(sizeItems);

        if (id) await reloadProduct(id);
        else if (categoryItems[0]) setForm((current) => ({ ...current, category_id: categoryItems[0].id }));
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const productId = product?.id;
  const selectedColor = useMemo(
    () => colors.find((color) => color.id === variant.color_id),
    [colors, variant.color_id],
  );

  async function save(event) {
    event.preventDefault();
    if (busy) return;

    setError(null);

    const errors = {};
    const nameErr = validateRequiredField(form.name, "Le nom du produit");
    if (nameErr) errors.name = nameErr;

    const catErr = validateRequiredField(form.category_id, "La catégorie");
    if (catErr) errors.category_id = catErr;

    const typeErr = validateRequiredField(form.type, "Le type de produit");
    if (typeErr) errors.type = typeErr;

    const priceErr = validatePositiveInt(form.price_xof, "Le prix FCFA");
    if (priceErr) errors.price_xof = priceErr;

    setProductErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);

    try {
      const payload = { ...form, price_xof: Number(form.price_xof) };
      if (!payload.slug) delete payload.slug;
      payload.tag = payload.tag || null;

      const saved = isNew
        ? await adminApi.createProduct(payload)
        : await adminApi.updateProduct(id, payload);

      if (isNew) navigate(`/admin/products/${saved.id}`, { replace: true });
      else setProduct(saved);
    } catch (err) {
      const beErrors = extractFieldErrors(err);
      if (Object.keys(beErrors).length > 0) setProductErrors(beErrors);
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct() {
    if (!window.confirm("Supprimer définitivement ce produit et ses variantes ?")) return;
    try {
      await adminApi.deleteProduct(id);
      navigate("/admin/products");
    } catch (err) {
      setError(err);
    }
  }

  async function addVariant(event) {
    event.preventDefault();
    if (busy || !productId) return;

    const errors = {};
    const colorErr = validateRequiredField(variant.color_id, "La couleur");
    if (colorErr) errors.color_id = colorErr;

    const skuErr = validateRequiredField(variant.sku, "Le code SKU");
    if (skuErr) errors.sku = skuErr;

    const stockErr = validatePositiveInt(variant.initial_stock, "Le stock initial");
    if (stockErr) errors.initial_stock = stockErr;

    if (variant.price_xof !== "" && variant.price_xof !== null && variant.price_xof !== undefined) {
      const priceErr = validatePositiveInt(variant.price_xof, "Le prix spécifique", { required: false });
      if (priceErr) errors.price_xof = priceErr;
    }

    setVariantErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);

    try {
      const payload = {
        ...variant,
        size_id: variant.size_id || null,
        price_xof: variant.price_xof ? Number(variant.price_xof) : null,
        initial_stock: Number(variant.initial_stock || 0),
      };

      await adminApi.createVariant(productId, payload);
      setVariant(EMPTY_VARIANT);
      setVariantErrors({});
      await reloadProduct(productId);
    } catch (err) {
      const beErrors = extractFieldErrors(err);
      if (Object.keys(beErrors).length > 0) setVariantErrors(beErrors);
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeVariant(variantId) {
    if (!window.confirm("Supprimer cette variante ?")) return;
    try {
      await adminApi.deleteVariant(variantId);
      await reloadProduct(productId);
    } catch (err) {
      setError(err);
    }
  }

  function startVariantEdit(currentVariant) {
    setEditingVariantId(currentVariant.id);
    setVariantEdit({
      color_id: currentVariant.color.id,
      size_id: currentVariant.size?.id || "",
      sku: currentVariant.sku,
      price_xof: currentVariant.price_xof ?? "",
      is_active: currentVariant.is_active,
    });
  }

  function cancelVariantEdit() {
    setEditingVariantId(null);
    setVariantEdit(null);
  }

  async function saveVariantEdit(event, variantId) {
    event.preventDefault();
    if (busy || !variantEdit) return;
    setBusy(true);

    try {
      await adminApi.updateVariant(variantId, {
        color_id: variantEdit.color_id,
        size_id: variantEdit.size_id || null,
        sku: variantEdit.sku.trim(),
        price_xof: variantEdit.price_xof === "" ? null : Number(variantEdit.price_xof),
        is_active: variantEdit.is_active,
      });
      cancelVariantEdit();
      await reloadProduct(productId);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function adjustStock(currentVariant, delta) {
    try {
      await adminApi.adjustStock(currentVariant.id, {
        delta,
        reason: "Ajustement rapide depuis la fiche produit",
      });
      await reloadProduct(productId);
    } catch (err) {
      setError(err);
    }
  }

  async function uploadImage(event) {
    event.preventDefault();
    if (busy || !imageFile) return;
    setBusy(true);

    try {
      const data = new FormData();
      data.append("file", imageFile);
      data.append("alt_text", imageAlt);
      await adminApi.uploadImage(productId, data);
      setImageFile(null);
      setImageAlt("");
      event.currentTarget.reset();
      await reloadProduct(productId);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(image) {
    try {
      await adminApi.updateImage(image.id, { is_primary: true });
      await reloadProduct(productId);
    } catch (err) {
      setError(err);
    }
  }

  async function removeImage(imageId) {
    if (!window.confirm("Supprimer cette image ?")) return;
    try {
      await adminApi.deleteImage(imageId);
      await reloadProduct(productId);
    } catch (err) {
      setError(err);
    }
  }

  if (loading) return <AdminLoading message="Chargement du produit…" />;

  return (
    <>
      <AdminTitle
        title={isNew ? "Nouveau produit" : product?.name || "Produit"}
        subtitle={isNew ? "Créer la fiche produit avant d’ajouter variantes et images." : `Prix actuel : ${formatXof(product?.price_xof)}`}
        action={<Link className={ghostButtonClass} to="/admin/products">Retour aux produits</Link>}
      />
      <AdminError error={error} onRetry={id ? () => reloadProduct(id) : undefined} />

      <form onSubmit={save} noValidate>
        <AdminCard>
          <div className="grid gap-5 md:grid-cols-2 md:gap-x-7">
            <label className="block">
              <span className="field-label">
                Nom <span className="text-accent" aria-hidden="true">*</span>
              </span>
              <input
                className={`${inputClass} mt-1 ${productErrors.name ? "border-danger focus:border-danger" : ""}`}
                value={form.name}
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value });
                  if (productErrors.name) setProductErrors((c) => ({ ...c, name: null }));
                }}
              />
              {productErrors.name && (
                <p className="mt-1 text-xs text-danger" role="alert">{productErrors.name}</p>
              )}
            </label>

            <label className="block">
              <span className="field-label">
                Catégorie <span className="text-accent" aria-hidden="true">*</span>
              </span>
              <select
                className={`${inputClass} mt-1 ${productErrors.category_id ? "border-danger focus:border-danger" : ""}`}
                value={form.category_id}
                onChange={(event) => {
                  setForm({ ...form, category_id: event.target.value });
                  if (productErrors.category_id) setProductErrors((c) => ({ ...c, category_id: null }));
                }}
              >
                {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
              </select>
              {productErrors.category_id && (
                <p className="mt-1 text-xs text-danger" role="alert">{productErrors.category_id}</p>
              )}
            </label>

            <label className="block">
              <span className="field-label">Slug <span className="normal-case tracking-normal text-muted">(automatique si vide)</span></span>
              <input className={`${inputClass} mt-1`} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            </label>

            <label className="block">
              <span className="field-label">
                Type <span className="text-accent" aria-hidden="true">*</span>
              </span>
              <input
                className={`${inputClass} mt-1 ${productErrors.type ? "border-danger focus:border-danger" : ""}`}
                value={form.type}
                onChange={(event) => {
                  setForm({ ...form, type: event.target.value });
                  if (productErrors.type) setProductErrors((c) => ({ ...c, type: null }));
                }}
              />
              {productErrors.type && (
                <p className="mt-1 text-xs text-danger" role="alert">{productErrors.type}</p>
              )}
            </label>

            <label className="block">
              <span className="field-label">
                Prix FCFA <span className="text-accent" aria-hidden="true">*</span>
              </span>
              <input
                min="0"
                type="number"
                className={`${inputClass} mt-1 ${productErrors.price_xof ? "border-danger focus:border-danger" : ""}`}
                value={form.price_xof}
                onChange={(event) => {
                  setForm({ ...form, price_xof: event.target.value });
                  if (productErrors.price_xof) setProductErrors((c) => ({ ...c, price_xof: null }));
                }}
              />
              {productErrors.price_xof && (
                <p className="mt-1 text-xs text-danger" role="alert">{productErrors.price_xof}</p>
              )}
            </label>

            <label className="block">
              <span className="field-label">Badge / tag</span>
              <input className={`${inputClass} mt-1`} value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })} />
            </label>

            <label className="block md:col-span-2">
              <span className="field-label">Description</span>
              <textarea rows="4" className={`${inputClass} mt-1 resize-y`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>

            <label className="block md:col-span-2">
              <span className="field-label">Matière / entretien</span>
              <textarea rows="3" className={`${inputClass} mt-1 resize-y`} value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })} />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <label className="flex items-center gap-2.5 text-sm text-fg">
              <input type="checkbox" checked={form.is_new} onChange={(event) => setForm({ ...form, is_new: event.target.checked })} />
              Nouveau produit
            </label>
            <label className="flex items-center gap-2.5 text-sm text-fg">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              Visible dans la boutique
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button disabled={busy} className={`${buttonClass} w-full sm:w-auto`}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
            {!isNew && (
              <button type="button" onClick={removeProduct} className={`${dangerButtonClass} w-full sm:w-auto`}>
                Supprimer le produit
              </button>
            )}
          </div>
        </AdminCard>
      </form>

      {!isNew && (
        <div className="mt-6 grid gap-6 2xl:grid-cols-2">
          <AdminCard>
            <h2 className="font-display text-2xl font-light text-fg">Variantes et stock</h2>
            <p className="mt-1 text-sm text-muted">Ajoutez les déclinaisons puis ajustez leur stock individuellement.</p>

            <form onSubmit={addVariant} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">
                  Couleur <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <select
                  className={`${inputClass} mt-1 ${variantErrors.color_id ? "border-danger focus:border-danger" : ""}`}
                  value={variant.color_id}
                  onChange={(event) => {
                    setVariant({ ...variant, color_id: event.target.value });
                    if (variantErrors.color_id) setVariantErrors((c) => ({ ...c, color_id: null }));
                  }}
                >
                  <option value="">Choisir…</option>
                  {colors.filter((color) => color.is_active).map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>
                {variantErrors.color_id && (
                  <p className="mt-1 text-xs text-danger" role="alert">{variantErrors.color_id}</p>
                )}
              </label>

              <label className="block">
                <span className="field-label">Taille</span>
                <select className={`${inputClass} mt-1`} value={variant.size_id} onChange={(event) => setVariant({ ...variant, size_id: event.target.value })}>
                  <option value="">Sans taille</option>
                  {sizes.filter((size) => size.is_active).map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="field-label">
                  SKU <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <input
                  className={`${inputClass} mt-1 ${variantErrors.sku ? "border-danger focus:border-danger" : ""}`}
                  placeholder={selectedColor ? `Ex. ...-${selectedColor.slug}` : "Référence variante"}
                  value={variant.sku}
                  onChange={(event) => {
                    setVariant({ ...variant, sku: event.target.value });
                    if (variantErrors.sku) setVariantErrors((c) => ({ ...c, sku: null }));
                  }}
                />
                {variantErrors.sku && (
                  <p className="mt-1 text-xs text-danger" role="alert">{variantErrors.sku}</p>
                )}
              </label>

              <label className="block">
                <span className="field-label">Prix spécifique</span>
                <input
                  className={`${inputClass} mt-1 ${variantErrors.price_xof ? "border-danger focus:border-danger" : ""}`}
                  type="number"
                  min="0"
                  placeholder="Optionnel"
                  value={variant.price_xof}
                  onChange={(event) => {
                    setVariant({ ...variant, price_xof: event.target.value });
                    if (variantErrors.price_xof) setVariantErrors((c) => ({ ...c, price_xof: null }));
                  }}
                />
                {variantErrors.price_xof && (
                  <p className="mt-1 text-xs text-danger" role="alert">{variantErrors.price_xof}</p>
                )}
              </label>

              <label className="block">
                <span className="field-label">
                  Stock initial <span className="text-accent" aria-hidden="true">*</span>
                </span>
                <input
                  className={`${inputClass} mt-1 ${variantErrors.initial_stock ? "border-danger focus:border-danger" : ""}`}
                  type="number"
                  min="0"
                  value={variant.initial_stock}
                  onChange={(event) => {
                    setVariant({ ...variant, initial_stock: event.target.value });
                    if (variantErrors.initial_stock) setVariantErrors((c) => ({ ...c, initial_stock: null }));
                  }}
                />
                {variantErrors.initial_stock && (
                  <p className="mt-1 text-xs text-danger" role="alert">{variantErrors.initial_stock}</p>
                )}
              </label>

              <div className="flex items-end">
                <button className={`${buttonClass} w-full`}>Ajouter la variante</button>
              </div>
            </form>

            <div className="mt-7 space-y-3">
              {product?.variants?.map((currentVariant) => (
                <article key={currentVariant.id} className="border border-line bg-bg/45 p-4">
                  {editingVariantId === currentVariant.id && variantEdit ? (
                    <form onSubmit={(event) => saveVariantEdit(event, currentVariant.id)} className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="field-label">Couleur</span>
                        <select required className={`${inputClass} mt-1`} value={variantEdit.color_id} onChange={(event) => setVariantEdit({ ...variantEdit, color_id: event.target.value })}>
                          {colors.map((color) => <option key={color.id} value={color.id}>{color.name}{color.is_active ? "" : " (masquée)"}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="field-label">Taille</span>
                        <select className={`${inputClass} mt-1`} value={variantEdit.size_id} onChange={(event) => setVariantEdit({ ...variantEdit, size_id: event.target.value })}>
                          <option value="">Sans taille</option>
                          {sizes.map((size) => <option key={size.id} value={size.id}>{size.label}{size.is_active ? "" : " (masquée)"}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="field-label">SKU</span>
                        <input required className={`${inputClass} mt-1`} value={variantEdit.sku} onChange={(event) => setVariantEdit({ ...variantEdit, sku: event.target.value })} />
                      </label>
                      <label className="block">
                        <span className="field-label">Prix spécifique</span>
                        <input type="number" min="0" className={`${inputClass} mt-1`} placeholder="Prix du produit" value={variantEdit.price_xof} onChange={(event) => setVariantEdit({ ...variantEdit, price_xof: event.target.value })} />
                      </label>
                      <label className="flex items-center gap-2.5 text-sm text-fg sm:col-span-2">
                        <input type="checkbox" checked={variantEdit.is_active} onChange={(event) => setVariantEdit({ ...variantEdit, is_active: event.target.checked })} />
                        Variante active
                      </label>
                      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:col-span-2 sm:flex-row">
                        <button className={`${buttonClass} w-full sm:w-auto`}>Enregistrer</button>
                        <button type="button" className={`${ghostButtonClass} w-full sm:w-auto`} onClick={cancelVariantEdit}>Annuler</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-fg">
                              {currentVariant.color.name}{currentVariant.size ? ` / ${currentVariant.size.label}` : ""}
                            </div>
                            <AdminStatus tone={currentVariant.is_active ? "success" : "neutral"}>
                              {currentVariant.is_active ? "Active" : "Masquée"}
                            </AdminStatus>
                          </div>
                          <div className="mt-1 break-all font-mono text-[11px] text-muted">{currentVariant.sku}</div>
                          {currentVariant.price_xof != null && (
                            <div className="mt-1 text-xs text-muted">Prix spécifique : {formatXof(currentVariant.price_xof)}</div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={() => startVariantEdit(currentVariant)} className="lnk shrink-0">Modifier</button>
                          <button type="button" onClick={() => removeVariant(currentVariant.id)} className="lnk shrink-0 text-danger">Supprimer</button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                          <span>Stock <strong className="font-medium text-fg">{currentVariant.stock_quantity}</strong></span>
                          <span>Réservé <strong className="font-medium text-fg">{currentVariant.reserved_quantity}</strong></span>
                          <span>Disponible <strong className="font-medium text-fg">{currentVariant.available_quantity}</strong></span>
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                          <button type="button" className={compactButtonClass} onClick={() => adjustStock(currentVariant, -1)} disabled={currentVariant.available_quantity <= 0}>−1</button>
                          <button type="button" className={compactButtonClass} onClick={() => adjustStock(currentVariant, 1)}>+1</button>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="font-display text-2xl font-light text-fg">Images</h2>
            <p className="mt-1 text-sm text-muted">JPEG, PNG ou WebP. Choisissez ensuite l’image principale.</p>

            <form onSubmit={uploadImage} className="mt-6 space-y-5">
              <label className="block">
                <span className="field-label">Fichier</span>
                <input required className={`${fileInputClass} mt-2`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
              </label>

              <label className="block">
                <span className="field-label">Texte alternatif</span>
                <input className={`${inputClass} mt-1`} placeholder="Description courte de l’image" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} />
              </label>

              <button className={`${buttonClass} w-full sm:w-auto`}>Uploader l’image</button>
            </form>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-2 min-[1500px]:grid-cols-3">
              {product?.images?.map((image) => (
                <article key={image.id} className="overflow-hidden border border-line bg-bg/45">
                  <img src={mediaUrl(image.url)} className="aspect-[4/5] w-full object-cover" alt={image.alt_text || product?.name || "Produit"} />
                  <div className="p-3 text-xs">
                    <div className="truncate text-muted">{image.alt_text || "Sans texte alternatif"}</div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      {image.is_primary ? (
                        <AdminStatus tone="success">Principale</AdminStatus>
                      ) : (
                        <button type="button" className="lnk text-fg" onClick={() => makePrimary(image)}>Principale</button>
                      )}
                      <button type="button" className="lnk text-danger sm:ml-auto" onClick={() => removeImage(image.id)}>Supprimer</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </AdminCard>
        </div>
      )}
    </>
  );
}
