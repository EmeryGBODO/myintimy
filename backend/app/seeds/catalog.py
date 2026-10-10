from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Category, Color, InventoryMovement, Product, ProductVariant, Size

SEED_FILE = Path(__file__).with_name("catalog_seed.json")


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")


def _load_seed() -> dict:
    return json.loads(SEED_FILE.read_text(encoding="utf-8"))


def seed_catalog(db: Session, *, initial_stock: int = 12) -> dict[str, int]:
    data = _load_seed()
    counts = {"categories": 0, "colors": 0, "sizes": 0, "products": 0, "variants": 0}

    categories: dict[str, Category] = {}
    category_order = ["lingerie", "vetements", "nuit", "couple"]
    for order, slug in enumerate(category_order):
        meta = data["categories"][slug]
        category = db.scalar(select(Category).where(Category.slug == slug))
        if category is None:
            category = Category(slug=slug, title=meta["title"], subtitle=meta["subtitle"], display_order=order)
            db.add(category)
            db.flush()
            counts["categories"] += 1
        else:
            category.title = meta["title"]
            category.subtitle = meta["subtitle"]
            category.display_order = order
            category.is_active = True
        categories[slug] = category

    colors: dict[str, Color] = {}
    for order, (slug, meta) in enumerate(data["colors"].items()):
        color = db.scalar(select(Color).where(Color.slug == slug))
        if color is None:
            color = Color(slug=slug, name=meta["n"], hex_value=meta["h"], display_order=order)
            db.add(color)
            db.flush()
            counts["colors"] += 1
        else:
            color.name = meta["n"]
            color.hex_value = meta["h"]
            color.display_order = order
            color.is_active = True
        colors[slug] = color

    size_codes: list[str] = []
    for product in data["products"]:
        for code in product.get("sizes") or []:
            if code not in size_codes:
                size_codes.append(code)
    sizes: dict[str, Size] = {}
    for order, code in enumerate(size_codes):
        size = db.scalar(select(Size).where(Size.code == code))
        if size is None:
            size = Size(code=code, label=code, display_order=order)
            db.add(size)
            db.flush()
            counts["sizes"] += 1
        else:
            size.label = code
            size.display_order = order
            size.is_active = True
        sizes[code] = size

    for item in data["products"]:
        product = db.scalar(select(Product).where(Product.legacy_id == item["id"]))
        product_slug = slugify(item["name"])
        if product is None:
            product = Product(
                legacy_id=item["id"],
                slug=product_slug,
                category_id=categories[item["category"]].id,
                type=item["type"],
                name=item["name"],
                price_xof=item["price"],
                tag=item.get("tag"),
                is_new=item.get("isNew", False),
                description=item["description"],
                material=item.get("material", ""),
            )
            db.add(product)
            db.flush()
            counts["products"] += 1
        else:
            product.slug = product_slug
            product.category_id = categories[item["category"]].id
            product.type = item["type"]
            product.name = item["name"]
            product.price_xof = item["price"]
            product.tag = item.get("tag")
            product.is_new = item.get("isNew", False)
            product.description = item["description"]
            product.material = item.get("material", "")
            product.is_active = True

        dimensions = [(color_slug, size_code) for color_slug in item["colors"] for size_code in (item.get("sizes") or [None])]
        expected_skus: set[str] = set()
        for color_slug, size_code in dimensions:
            sku = f"MYI-{item['id']:03d}-{color_slug.upper()}-{(size_code or 'STD').replace('/', '').upper()}"
            expected_skus.add(sku)
            variant = db.scalar(select(ProductVariant).where(ProductVariant.sku == sku))
            if variant is None:
                variant = ProductVariant(
                    product_id=product.id,
                    color_id=colors[color_slug].id,
                    size_id=sizes[size_code].id if size_code else None,
                    sku=sku,
                    stock_quantity=initial_stock,
                    reserved_quantity=0,
                    is_active=True,
                )
                db.add(variant)
                db.flush()
                db.add(
                    InventoryMovement(
                        variant_id=variant.id,
                        movement_type="initial_stock",
                        quantity_delta=initial_stock,
                        quantity_after=initial_stock,
                        reason="Stock initial de démonstration Phase 2",
                        reference="phase2-seed",
                    )
                )
                counts["variants"] += 1
            else:
                variant.product_id = product.id
                variant.color_id = colors[color_slug].id
                variant.size_id = sizes[size_code].id if size_code else None
                variant.is_active = True

        for variant in product.variants:
            if variant.sku not in expected_skus:
                variant.is_active = False

    db.commit()
    return counts
