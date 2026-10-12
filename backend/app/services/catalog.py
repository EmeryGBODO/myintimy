from __future__ import annotations

from collections.abc import Iterable

from app.core.exceptions import ApiException
from app.models.catalog import Category, Color, Product, ProductImage, ProductVariant, Size
from app.repositories.catalog import CatalogRepository


def _category_data(category: Category) -> dict:
    return {
        "id": category.id,
        "slug": category.slug,
        "title": category.title,
        "subtitle": category.subtitle,
        "display_order": category.display_order,
    }


def _color_data(color: Color) -> dict:
    return {"id": color.id, "slug": color.slug, "name": color.name, "hex_value": color.hex_value}


def _size_data(size: Size) -> dict:
    return {"id": size.id, "code": size.code, "label": size.label, "display_order": size.display_order}


def _variant_data(variant: ProductVariant) -> dict:
    return {
        "id": variant.id,
        "sku": variant.sku,
        "color": _color_data(variant.color),
        "size": _size_data(variant.size) if variant.size else None,
        "price_xof": variant.price_xof,
        "stock_quantity": variant.stock_quantity,
        "reserved_quantity": variant.reserved_quantity,
        "available_quantity": variant.available_quantity,
        "in_stock": variant.is_active and variant.available_quantity > 0,
    }


def _image_data(image: ProductImage) -> dict:
    return {
        "id": image.id,
        "url": image.url,
        "alt_text": image.alt_text,
        "position": image.position,
        "is_primary": image.is_primary,
        "color_slug": image.color.slug if image.color else None,
    }


def product_data(product: Product) -> dict:
    active_variants = [variant for variant in product.variants if variant.is_active]
    colors_by_slug: dict[str, Color] = {}
    sizes_by_code: dict[str, Size] = {}
    for variant in active_variants:
        if variant.color.is_active:
            colors_by_slug.setdefault(variant.color.slug, variant.color)
        if variant.size and variant.size.is_active:
            sizes_by_code.setdefault(variant.size.code, variant.size)

    colors = sorted(colors_by_slug.values(), key=lambda item: (item.display_order, item.name))
    sizes = sorted(sizes_by_code.values(), key=lambda item: (item.display_order, item.code))
    images = sorted(product.images, key=lambda item: item.position)

    return {
        "id": product.id,
        "legacy_id": product.legacy_id,
        "public_id": str(product.legacy_id) if product.legacy_id is not None else product.slug,
        "slug": product.slug,
        "category": _category_data(product.category),
        "type": product.type,
        "name": product.name,
        "price_xof": product.price_xof,
        "tag": product.tag,
        "is_new": product.is_new,
        "description": product.description,
        "material": product.material,
        "colors": [_color_data(color) for color in colors],
        "sizes": [_size_data(size) for size in sizes],
        "variants": [
            _variant_data(variant)
            for variant in sorted(
                active_variants,
                key=lambda item: (
                    item.color.display_order,
                    item.size.display_order if item.size else -1,
                    item.sku,
                ),
            )
        ],
        "images": [_image_data(image) for image in images],
        "in_stock": any(variant.is_active and variant.available_quantity > 0 for variant in active_variants),
    }


class CatalogService:
    def __init__(self, repository: CatalogRepository) -> None:
        self.repository = repository

    def categories(self) -> list[dict]:
        return [_category_data(category) for category in self.repository.list_categories()]

    def category(self, slug: str) -> dict:
        category = self.repository.get_category(slug)
        if not category:
            raise ApiException(status_code=404, code="CATEGORY_NOT_FOUND", message="La catégorie demandée n'existe pas.")
        return _category_data(category)

    def colors(self) -> list[dict]:
        return [_color_data(color) for color in self.repository.list_colors()]

    def sizes(self) -> list[dict]:
        return [_size_data(size) for size in self.repository.list_sizes()]

    def products(self, **filters) -> dict:
        products, total = self.repository.list_products(**filters)
        return {
            "items": [product_data(product) for product in products],
            "total": total,
            "limit": filters["limit"],
            "offset": filters["offset"],
        }

    def product(self, identifier: str) -> dict:
        product = self.repository.get_product(identifier)
        if not product:
            raise ApiException(status_code=404, code="PRODUCT_NOT_FOUND", message="Le produit demandé n'existe pas.")
        return product_data(product)

    def related(self, identifier: str, limit: int = 4) -> list[dict]:
        product = self.repository.get_product(identifier)
        if not product:
            raise ApiException(status_code=404, code="PRODUCT_NOT_FOUND", message="Le produit demandé n'existe pas.")
        return [product_data(item) for item in self.repository.related_products(product, limit=limit)]
