import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi, mediaUrl } from "../../api/admin.js";
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
    setBusy(true);
    setError(null);

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
    if (!productId) return;

    try {
      const payload = {
        ...variant,
        size_id: variant.size_id || null,
        price_xof: variant.price_xof ? Number(variant.price_xof) : null,
        initial_stock: Number(variant.initial_stock || 0),
      };

      await adminApi.createVariant(productId, payload);
      setVariant(EMPTY_VARIANT);
      await reloadProduct(productId);
    } catch (err) {
      setError(err);
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
    if (!imageFile) return;

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

  if (loading) return <AdminLoading />;

  return (
    <>
      <AdminTitle
        title={isNew ? "Nouveau produit" : product?.name || "Produit"}
        subtitle={isNew ? "Créer la fiche produit avant d’ajouter variantes et images." : `Prix actuel : ${formatXof(product?.price_xof)}`}
        action={<Link className={ghostButtonClass} to="/admin/products">Retour aux produits</Link>}
      />
      <AdminError error={error} />

      <form onSubmit={save}>
        <AdminCard>
          <div className="grid gap-5 md:grid-cols-2 md:gap-x-7">
            <label className="block">
              <span className="field-label">Nom</span>
              <input required className={`${inputClass} mt-1`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>

            <label className="block">
              <span className="field-label">Catégorie</span>
              <select required className={`${inputClass} mt-1`} value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="field-label">Slug <span className="normal-case tracking-normal text-muted">(automatique si vide)</span></span>
              <input className={`${inputClass} mt-1`} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            </label>

            <label className="block">
              <span className="field-label">Type</span>
              <input required className={`${inputClass} mt-1`} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} />
            </label>

            <label className="block">
              <span className="field-label">Prix FCFA</span>
              <input required min="0" type="number" className={`${inputClass} mt-1`} value={form.price_xof} onChange={(event) => setForm({ ...form, price_xof: event.target.value })} />
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

            <form onSubmit={addVariant} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Couleur</span>
                <select required className={`${inputClass} mt-1`} value={variant.color_id} onChange={(event) => setVariant({ ...variant, color_id: event.target.value })}>
                  <option value="">Choisir…</option>
                  {colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="field-label">Taille</span>
                <select className={`${inputClass} mt-1`} value={variant.size_id} onChange={(event) => setVariant({ ...variant, size_id: event.target.value })}>
                  <option value="">Sans taille</option>
                  {sizes.map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="field-label">SKU</span>
                <input required className={`${inputClass} mt-1`} placeholder={selectedColor ? `Ex. ...-${selectedColor.slug}` : "Référence variante"} value={variant.sku} onChange={(event) => setVariant({ ...variant, sku: event.target.value })} />
              </label>

              <label className="block">
                <span className="field-label">Prix spécifique</span>
                <input className={`${inputClass} mt-1`} type="number" min="0" placeholder="Optionnel" value={variant.price_xof} onChange={(event) => setVariant({ ...variant, price_xof: event.target.value })} />
              </label>

              <label className="block">
                <span className="field-label">Stock initial</span>
                <input className={`${inputClass} mt-1`} type="number" min="0" value={variant.initial_stock} onChange={(event) => setVariant({ ...variant, initial_stock: event.target.value })} />
              </label>

              <div className="flex items-end">
                <button className={`${buttonClass} w-full`}>Ajouter la variante</button>
              </div>
            </form>

            <div className="mt-7 space-y-3">
              {product?.variants?.map((currentVariant) => (
                <article key={currentVariant.id} className="border border-line bg-bg/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-fg">
                        {currentVariant.color.name}{currentVariant.size ? ` / ${currentVariant.size.label}` : ""}
                      </div>
                      <div className="mt-0.5 break-all font-mono text-[11px] text-muted">{currentVariant.sku}</div>
                    </div>
                    <button type="button" onClick={() => removeVariant(currentVariant.id)} className="lnk shrink-0 text-danger">
                      Supprimer
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>Stock <strong className="font-medium text-fg">{currentVariant.stock_quantity}</strong></span>
                      <span>Disponible <strong className="font-medium text-fg">{currentVariant.available_quantity}</strong></span>
                    </div>
                    <div className="flex gap-2 sm:ml-auto">
                      <button type="button" className={compactButtonClass} onClick={() => adjustStock(currentVariant, -1)} disabled={currentVariant.available_quantity <= 0}>−1</button>
                      <button type="button" className={compactButtonClass} onClick={() => adjustStock(currentVariant, 1)}>+1</button>
                    </div>
                  </div>
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
