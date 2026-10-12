from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models.admin import AdminUser
from app.models.catalog import ProductImage, ProductVariant
from app.schemas.admin import (
    AdminCategoryCreate,
    AdminCategoryOut,
    AdminCategoryUpdate,
    AdminColorCreate,
    AdminColorOut,
    AdminColorUpdate,
    AdminDashboardOut,
    AdminImageOrderUpdate,
    AdminImageUpdate,
    AdminProductCreate,
    AdminProductUpdate,
    AdminSizeCreate,
    AdminSizeOut,
    AdminSizeUpdate,
    AdminStockAdjustIn,
    AdminStockMovementOut,
    AdminVariantCreate,
    AdminVariantUpdate,
)
from app.services.admin_catalog import AdminCatalogService
from app.services.inventory import InventoryService
from app.services.media import ProductImageService

router = APIRouter(prefix="/admin", tags=["admin-catalog"], dependencies=[Depends(get_current_admin)])


def _variant_dict(variant: ProductVariant) -> dict:
    color = variant.color
    size = variant.size
    return {
        "id": str(variant.id),
        "sku": variant.sku,
        "color": {"id": str(color.id), "slug": color.slug, "name": color.name, "hex_value": color.hex_value},
        "size": None if not size else {"id": str(size.id), "code": size.code, "label": size.label},
        "price_xof": variant.price_xof,
        "stock_quantity": variant.stock_quantity,
        "reserved_quantity": variant.reserved_quantity,
        "available_quantity": variant.available_quantity,
        "is_active": variant.is_active,
    }


def _image_dict(image: ProductImage) -> dict:
    return {
        "id": str(image.id),
        "url": image.url,
        "alt_text": image.alt_text,
        "position": image.position,
        "is_primary": image.is_primary,
        "color_id": str(image.color_id) if image.color_id else None,
    }


def _product_dict(product, *, detailed: bool = True) -> dict:
    payload = {
        "id": str(product.id),
        "legacy_id": product.legacy_id,
        "slug": product.slug,
        "category": {
            "id": str(product.category.id),
            "slug": product.category.slug,
            "title": product.category.title,
        },
        "type": product.type,
        "name": product.name,
        "price_xof": product.price_xof,
        "tag": product.tag,
        "is_new": product.is_new,
        "description": product.description,
        "material": product.material,
        "is_active": product.is_active,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
    }
    if detailed:
        payload["variants"] = [_variant_dict(v) for v in product.variants]
        payload["images"] = [_image_dict(i) for i in sorted(product.images, key=lambda x: x.position)]
    else:
        payload["variant_count"] = len(product.variants)
        payload["stock_quantity"] = sum(v.stock_quantity for v in product.variants)
        payload["available_quantity"] = sum(v.available_quantity for v in product.variants)
    return payload


@router.get("/dashboard", response_model=AdminDashboardOut)
def dashboard(db: Session = Depends(get_db)):
    return AdminCatalogService(db).dashboard()


@router.get("/categories", response_model=list[AdminCategoryOut])
def categories(db: Session = Depends(get_db)):
    return AdminCatalogService(db).list_categories()


@router.post("/categories", response_model=AdminCategoryOut, status_code=201)
def create_category(payload: AdminCategoryCreate, db: Session = Depends(get_db)):
    return AdminCatalogService(db).create_category(payload)


@router.patch("/categories/{category_id}", response_model=AdminCategoryOut)
def update_category(category_id: UUID, payload: AdminCategoryUpdate, db: Session = Depends(get_db)):
    return AdminCatalogService(db).update_category(category_id, payload)


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: UUID, db: Session = Depends(get_db)):
    AdminCatalogService(db).delete_category(category_id)


@router.get("/products")
def products(q: str | None = Query(default=None, max_length=120), db: Session = Depends(get_db)):
    items = AdminCatalogService(db).list_products(q=q)
    return {"items": [_product_dict(product, detailed=False) for product in items], "total": len(items)}


@router.post("/products", status_code=201)
def create_product(payload: AdminProductCreate, db: Session = Depends(get_db)):
    return _product_dict(AdminCatalogService(db).create_product(payload))


@router.get("/products/{product_id}")
def product(product_id: UUID, db: Session = Depends(get_db)):
    return _product_dict(AdminCatalogService(db).get_product(product_id))


@router.patch("/products/{product_id}")
def update_product(product_id: UUID, payload: AdminProductUpdate, db: Session = Depends(get_db)):
    return _product_dict(AdminCatalogService(db).update_product(product_id, payload))


@router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: UUID, db: Session = Depends(get_db)):
    AdminCatalogService(db).delete_product(product_id)


@router.get("/inventory")
def inventory(db: Session = Depends(get_db)):
    variants = AdminCatalogService(db).list_inventory()
    return {
        "items": [
            {
                **_variant_dict(variant),
                "product": {
                    "id": str(variant.product.id),
                    "name": variant.product.name,
                    "slug": variant.product.slug,
                    "is_active": variant.product.is_active,
                },
            }
            for variant in variants
        ],
        "total": len(variants),
    }


@router.get("/colors", response_model=list[AdminColorOut])
def colors(db: Session = Depends(get_db)):
    return AdminCatalogService(db).list_colors()


@router.post("/colors", response_model=AdminColorOut, status_code=201)
def create_color(payload: AdminColorCreate, db: Session = Depends(get_db)):
    return AdminCatalogService(db).create_color(payload)


@router.patch("/colors/{color_id}", response_model=AdminColorOut)
def update_color(color_id: UUID, payload: AdminColorUpdate, db: Session = Depends(get_db)):
    return AdminCatalogService(db).update_color(color_id, payload)


@router.delete("/colors/{color_id}", status_code=204)
def delete_color(color_id: UUID, db: Session = Depends(get_db)):
    AdminCatalogService(db).delete_color(color_id)


@router.get("/sizes", response_model=list[AdminSizeOut])
def sizes(db: Session = Depends(get_db)):
    return AdminCatalogService(db).list_sizes()


@router.post("/sizes", response_model=AdminSizeOut, status_code=201)
def create_size(payload: AdminSizeCreate, db: Session = Depends(get_db)):
    return AdminCatalogService(db).create_size(payload)


@router.patch("/sizes/{size_id}", response_model=AdminSizeOut)
def update_size(size_id: UUID, payload: AdminSizeUpdate, db: Session = Depends(get_db)):
    return AdminCatalogService(db).update_size(size_id, payload)


@router.delete("/sizes/{size_id}", status_code=204)
def delete_size(size_id: UUID, db: Session = Depends(get_db)):
    AdminCatalogService(db).delete_size(size_id)


@router.post("/products/{product_id}/variants", status_code=201)
def create_variant(product_id: UUID, payload: AdminVariantCreate, db: Session = Depends(get_db)):
    service = AdminCatalogService(db)
    service.create_variant(product_id, payload)
    product = service.get_product(product_id)
    created = next(v for v in product.variants if v.sku == payload.sku.strip())
    return _variant_dict(created)


@router.patch("/variants/{variant_id}")
def update_variant(variant_id: UUID, payload: AdminVariantUpdate, db: Session = Depends(get_db)):
    variant = AdminCatalogService(db).update_variant(variant_id, payload)
    # relationships are lazy-loaded within the active request/session
    return _variant_dict(variant)


@router.delete("/variants/{variant_id}", status_code=204)
def delete_variant(variant_id: UUID, db: Session = Depends(get_db)):
    AdminCatalogService(db).delete_variant(variant_id)


@router.post("/variants/{variant_id}/stock")
def adjust_stock(variant_id: UUID, payload: AdminStockAdjustIn, db: Session = Depends(get_db)):
    variant = InventoryService(db).adjust_stock(
        variant_id,
        delta=payload.delta,
        movement_type="admin_adjustment",
        reason=payload.reason,
        reference=payload.reference,
    )
    return _variant_dict(variant)


@router.get("/variants/{variant_id}/movements", response_model=list[AdminStockMovementOut])
def stock_movements(variant_id: UUID, db: Session = Depends(get_db)):
    return AdminCatalogService(db).movements(variant_id)


@router.post("/products/{product_id}/images", status_code=201)
async def upload_image(
    product_id: UUID,
    file: UploadFile = File(...),
    alt_text: str = Form(default=""),
    color_id: UUID | None = Form(default=None),
    db: Session = Depends(get_db),
):
    image = await ProductImageService(db).upload(product_id, file, alt_text=alt_text, color_id=color_id)
    return _image_dict(image)


@router.patch("/products/{product_id}/images/order")
def reorder_images(product_id: UUID, payload: AdminImageOrderUpdate, db: Session = Depends(get_db)):
    images = ProductImageService(db).reorder(product_id, payload.image_ids)
    return [_image_dict(image) for image in images]


@router.patch("/images/{image_id}")
def update_image(image_id: UUID, payload: AdminImageUpdate, db: Session = Depends(get_db)):
    values = payload.model_dump(exclude_unset=True)
    image = ProductImageService(db).update(image_id, fields_set=set(values), **values)
    return _image_dict(image)


@router.delete("/images/{image_id}", status_code=204)
def delete_image(image_id: UUID, db: Session = Depends(get_db)):
    ProductImageService(db).delete(image_id)
