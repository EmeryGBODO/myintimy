from __future__ import annotations

import re
import unicodedata
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ApiException
from app.models.catalog import Category, Color, InventoryMovement, Product, ProductImage, ProductVariant, Size
from app.schemas.admin import (
    AdminCategoryCreate,
    AdminCategoryUpdate,
    AdminColorCreate,
    AdminColorUpdate,
    AdminProductCreate,
    AdminProductUpdate,
    AdminSizeCreate,
    AdminSizeUpdate,
    AdminVariantCreate,
    AdminVariantUpdate,
)
from app.services.inventory import InventoryService


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "item"


class AdminCatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _commit(self, *, code: str = "CONFLICT", message: str = "Cette valeur existe déjà.") -> None:
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ApiException(status_code=409, code=code, message=message) from exc

    def dashboard(self) -> dict[str, int]:
        scalar = lambda stmt: int(self.db.scalar(stmt) or 0)
        return {
            "products_total": scalar(select(func.count(Product.id))),
            "products_active": scalar(select(func.count(Product.id)).where(Product.is_active.is_(True))),
            "categories_total": scalar(select(func.count(Category.id))),
            "variants_total": scalar(select(func.count(ProductVariant.id))),
            "low_stock_variants": scalar(select(func.count(ProductVariant.id)).where(ProductVariant.stock_quantity - ProductVariant.reserved_quantity > 0, ProductVariant.stock_quantity - ProductVariant.reserved_quantity <= 5)),
            "out_of_stock_variants": scalar(select(func.count(ProductVariant.id)).where(ProductVariant.stock_quantity - ProductVariant.reserved_quantity <= 0)),
            "stock_units_total": scalar(select(func.coalesce(func.sum(ProductVariant.stock_quantity), 0))),
        }

    def list_categories(self) -> list[Category]:
        return list(self.db.scalars(select(Category).order_by(Category.display_order, Category.title)))

    def create_category(self, data: AdminCategoryCreate) -> Category:
        category = Category(**data.model_dump(exclude={"slug"}), slug=slugify(data.slug or data.title))
        self.db.add(category)
        self._commit(code="CATEGORY_CONFLICT", message="Une catégorie utilise déjà ce slug.")
        self.db.refresh(category)
        return category

    def update_category(self, category_id: UUID, data: AdminCategoryUpdate) -> Category:
        category = self.db.get(Category, category_id)
        if not category:
            raise ApiException(status_code=404, code="CATEGORY_NOT_FOUND", message="La catégorie demandée n'existe pas.")
        changes = data.model_dump(exclude_unset=True)
        if "slug" in changes:
            changes["slug"] = slugify(changes["slug"])
        for key, value in changes.items():
            setattr(category, key, value)
        self._commit(code="CATEGORY_CONFLICT", message="Une catégorie utilise déjà ce slug.")
        self.db.refresh(category)
        return category

    def delete_category(self, category_id: UUID) -> None:
        category = self.db.get(Category, category_id)
        if not category:
            raise ApiException(status_code=404, code="CATEGORY_NOT_FOUND", message="La catégorie demandée n'existe pas.")
        count = self.db.scalar(select(func.count(Product.id)).where(Product.category_id == category_id)) or 0
        if count:
            raise ApiException(status_code=409, code="CATEGORY_IN_USE", message="Cette catégorie contient encore des produits.")
        self.db.delete(category)
        self.db.commit()

    def list_products(self, *, q: str | None = None) -> list[Product]:
        stmt = select(Product).options(selectinload(Product.category), selectinload(Product.variants).selectinload(ProductVariant.color), selectinload(Product.variants).selectinload(ProductVariant.size), selectinload(Product.images)).order_by(Product.updated_at.desc())
        if q:
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(Product.name.ilike(pattern) | Product.slug.ilike(pattern))
        return list(self.db.scalars(stmt).unique())

    def get_product(self, product_id: UUID) -> Product:
        stmt = select(Product).where(Product.id == product_id).options(selectinload(Product.category), selectinload(Product.variants).selectinload(ProductVariant.color), selectinload(Product.variants).selectinload(ProductVariant.size), selectinload(Product.images))
        product = self.db.scalar(stmt)
        if not product:
            raise ApiException(status_code=404, code="PRODUCT_NOT_FOUND", message="Le produit demandé n'existe pas.")
        return product

    def create_product(self, data: AdminProductCreate) -> Product:
        if not self.db.get(Category, data.category_id):
            raise ApiException(status_code=422, code="INVALID_CATEGORY", message="La catégorie sélectionnée n'existe pas.")
        payload = data.model_dump(exclude={"slug"})
        product = Product(**payload, slug=slugify(data.slug or data.name))
        self.db.add(product)
        self._commit(code="PRODUCT_CONFLICT", message="Un produit utilise déjà ce slug.")
        return self.get_product(product.id)

    def update_product(self, product_id: UUID, data: AdminProductUpdate) -> Product:
        product = self.get_product(product_id)
        changes = data.model_dump(exclude_unset=True)
        if "category_id" in changes and not self.db.get(Category, changes["category_id"]):
            raise ApiException(status_code=422, code="INVALID_CATEGORY", message="La catégorie sélectionnée n'existe pas.")
        if "slug" in changes:
            changes["slug"] = slugify(changes["slug"])
        for key, value in changes.items():
            setattr(product, key, value)
        self._commit(code="PRODUCT_CONFLICT", message="Un produit utilise déjà ce slug.")
        return self.get_product(product_id)

    def delete_product(self, product_id: UUID) -> None:
        product = self.get_product(product_id)
        self.db.delete(product)
        self.db.commit()

    def list_inventory(self) -> list[ProductVariant]:
        stmt = (
            select(ProductVariant)
            .join(ProductVariant.product)
            .options(
                selectinload(ProductVariant.product),
                selectinload(ProductVariant.color),
                selectinload(ProductVariant.size),
            )
            .order_by(Product.name, ProductVariant.sku)
        )
        return list(self.db.scalars(stmt).unique())

    def list_colors(self) -> list[Color]:
        return list(self.db.scalars(select(Color).order_by(Color.display_order, Color.name)))

    def create_color(self, data: AdminColorCreate) -> Color:
        color = Color(
            **data.model_dump(exclude={"slug", "hex_value"}),
            slug=slugify(data.slug or data.name),
            hex_value=data.hex_value.upper(),
        )
        self.db.add(color)
        self._commit(code="COLOR_CONFLICT", message="Une couleur utilise déjà ce slug.")
        self.db.refresh(color)
        return color

    def update_color(self, color_id: UUID, data: AdminColorUpdate) -> Color:
        color = self.db.get(Color, color_id)
        if not color:
            raise ApiException(status_code=404, code="COLOR_NOT_FOUND", message="La couleur demandée n'existe pas.")
        changes = data.model_dump(exclude_unset=True)
        if "slug" in changes:
            changes["slug"] = slugify(changes["slug"])
        if "hex_value" in changes:
            changes["hex_value"] = changes["hex_value"].upper()
        for key, value in changes.items():
            setattr(color, key, value)
        self._commit(code="COLOR_CONFLICT", message="Une couleur utilise déjà ce slug.")
        self.db.refresh(color)
        return color

    def delete_color(self, color_id: UUID) -> None:
        color = self.db.get(Color, color_id)
        if not color:
            raise ApiException(status_code=404, code="COLOR_NOT_FOUND", message="La couleur demandée n'existe pas.")
        count = self.db.scalar(select(func.count(ProductVariant.id)).where(ProductVariant.color_id == color_id)) or 0
        if count:
            raise ApiException(status_code=409, code="COLOR_IN_USE", message="Cette couleur est encore utilisée par des variantes.")
        for image in self.db.scalars(select(ProductImage).where(ProductImage.color_id == color_id)):
            image.color_id = None
        self.db.delete(color)
        self.db.commit()

    def list_sizes(self) -> list[Size]:
        return list(self.db.scalars(select(Size).order_by(Size.display_order, Size.label)))

    def create_size(self, data: AdminSizeCreate) -> Size:
        size = Size(
            code=data.code.strip().upper(),
            label=data.label.strip(),
            display_order=data.display_order,
            is_active=data.is_active,
        )
        self.db.add(size)
        self._commit(code="SIZE_CONFLICT", message="Une taille utilise déjà ce code.")
        self.db.refresh(size)
        return size

    def update_size(self, size_id: UUID, data: AdminSizeUpdate) -> Size:
        size = self.db.get(Size, size_id)
        if not size:
            raise ApiException(status_code=404, code="SIZE_NOT_FOUND", message="La taille demandée n'existe pas.")
        changes = data.model_dump(exclude_unset=True)
        if "code" in changes:
            changes["code"] = changes["code"].strip().upper()
        if "label" in changes:
            changes["label"] = changes["label"].strip()
        for key, value in changes.items():
            setattr(size, key, value)
        self._commit(code="SIZE_CONFLICT", message="Une taille utilise déjà ce code.")
        self.db.refresh(size)
        return size

    def delete_size(self, size_id: UUID) -> None:
        size = self.db.get(Size, size_id)
        if not size:
            raise ApiException(status_code=404, code="SIZE_NOT_FOUND", message="La taille demandée n'existe pas.")
        count = self.db.scalar(select(func.count(ProductVariant.id)).where(ProductVariant.size_id == size_id)) or 0
        if count:
            raise ApiException(status_code=409, code="SIZE_IN_USE", message="Cette taille est encore utilisée par des variantes.")
        self.db.delete(size)
        self.db.commit()

    def create_variant(self, product_id: UUID, data: AdminVariantCreate) -> ProductVariant:
        self.get_product(product_id)
        if not self.db.get(Color, data.color_id):
            raise ApiException(status_code=422, code="INVALID_COLOR", message="La couleur sélectionnée n'existe pas.")
        if data.size_id and not self.db.get(Size, data.size_id):
            raise ApiException(status_code=422, code="INVALID_SIZE", message="La taille sélectionnée n'existe pas.")
        variant = ProductVariant(product_id=product_id, color_id=data.color_id, size_id=data.size_id, sku=data.sku.strip(), price_xof=data.price_xof, stock_quantity=0, reserved_quantity=0, is_active=data.is_active)
        self.db.add(variant)
        self._commit(code="VARIANT_CONFLICT", message="Cette variante ou ce SKU existe déjà.")
        self.db.refresh(variant)
        if data.initial_stock:
            variant = InventoryService(self.db).adjust_stock(variant.id, delta=data.initial_stock, movement_type="initial_stock", reason="Stock initial depuis l'administration")
        return variant

    def update_variant(self, variant_id: UUID, data: AdminVariantUpdate) -> ProductVariant:
        variant = self.db.get(ProductVariant, variant_id)
        if not variant:
            raise ApiException(status_code=404, code="VARIANT_NOT_FOUND", message="La variante demandée n'existe pas.")
        changes = data.model_dump(exclude_unset=True)
        if "color_id" in changes and not self.db.get(Color, changes["color_id"]):
            raise ApiException(status_code=422, code="INVALID_COLOR", message="La couleur sélectionnée n'existe pas.")
        if changes.get("size_id") and not self.db.get(Size, changes["size_id"]):
            raise ApiException(status_code=422, code="INVALID_SIZE", message="La taille sélectionnée n'existe pas.")
        for key, value in changes.items():
            setattr(variant, key, value)
        self._commit(code="VARIANT_CONFLICT", message="Cette variante ou ce SKU existe déjà.")
        self.db.refresh(variant)
        return variant

    def delete_variant(self, variant_id: UUID) -> None:
        variant = self.db.get(ProductVariant, variant_id)
        if not variant:
            raise ApiException(status_code=404, code="VARIANT_NOT_FOUND", message="La variante demandée n'existe pas.")
        if variant.reserved_quantity:
            raise ApiException(status_code=409, code="VARIANT_RESERVED", message="Une variante avec du stock réservé ne peut pas être supprimée.")
        self.db.delete(variant)
        self.db.commit()

    def movements(self, variant_id: UUID) -> list[InventoryMovement]:
        return list(self.db.scalars(select(InventoryMovement).where(InventoryMovement.variant_id == variant_id).order_by(InventoryMovement.created_at.desc()).limit(100)))
