from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.catalog import Category, Color, Product, ProductImage, ProductVariant, Size


PRODUCT_LOADS = (
    joinedload(Product.category),
    selectinload(Product.variants).joinedload(ProductVariant.color),
    selectinload(Product.variants).joinedload(ProductVariant.size),
    selectinload(Product.images).joinedload(ProductImage.color),
)


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_categories(self) -> list[Category]:
        stmt = select(Category).where(Category.is_active.is_(True)).order_by(Category.display_order, Category.title)
        return list(self.db.scalars(stmt).all())

    def get_category(self, slug: str) -> Category | None:
        stmt = select(Category).where(Category.slug == slug, Category.is_active.is_(True))
        return self.db.scalar(stmt)

    def list_colors(self) -> list[Color]:
        stmt = select(Color).where(Color.is_active.is_(True)).order_by(Color.display_order, Color.name)
        return list(self.db.scalars(stmt).all())

    def list_sizes(self) -> list[Size]:
        stmt = select(Size).where(Size.is_active.is_(True)).order_by(Size.display_order, Size.code)
        return list(self.db.scalars(stmt).all())

    def _filtered_products_stmt(
        self,
        *,
        category: str | None = None,
        is_new: bool | None = None,
        color: str | None = None,
        size: str | None = None,
        min_price: int | None = None,
        max_price: int | None = None,
        query: str | None = None,
    ) -> Select[tuple[Product]]:
        stmt = select(Product).where(Product.is_active.is_(True))
        if category:
            stmt = stmt.where(Product.category.has(and_(Category.slug == category, Category.is_active.is_(True))))
        if is_new is not None:
            stmt = stmt.where(Product.is_new.is_(is_new))
        if min_price is not None:
            stmt = stmt.where(Product.price_xof >= min_price)
        if max_price is not None:
            stmt = stmt.where(Product.price_xof <= max_price)
        if query:
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Product.name.ilike(pattern),
                    Product.description.ilike(pattern),
                    Product.category.has(Category.title.ilike(pattern)),
                )
            )
        if color:
            color_variant = (
                select(ProductVariant.id)
                .join(ProductVariant.color)
                .where(
                    ProductVariant.product_id == Product.id,
                    ProductVariant.is_active.is_(True),
                    Color.slug == color,
                    Color.is_active.is_(True),
                )
                .exists()
            )
            stmt = stmt.where(color_variant)
        if size:
            size_variant = (
                select(ProductVariant.id)
                .join(ProductVariant.size)
                .where(
                    ProductVariant.product_id == Product.id,
                    ProductVariant.is_active.is_(True),
                    Size.code == size,
                    Size.is_active.is_(True),
                )
                .exists()
            )
            stmt = stmt.where(size_variant)
        return stmt

    def list_products(
        self,
        *,
        category: str | None = None,
        is_new: bool | None = None,
        color: str | None = None,
        size: str | None = None,
        min_price: int | None = None,
        max_price: int | None = None,
        query: str | None = None,
        sort: str = "selection",
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Product], int]:
        base = self._filtered_products_stmt(
            category=category,
            is_new=is_new,
            color=color,
            size=size,
            min_price=min_price,
            max_price=max_price,
            query=query,
        )
        count_stmt = select(func.count()).select_from(base.order_by(None).subquery())
        total = int(self.db.scalar(count_stmt) or 0)

        if sort == "price_asc":
            base = base.order_by(Product.price_xof.asc(), Product.name.asc())
        elif sort == "price_desc":
            base = base.order_by(Product.price_xof.desc(), Product.name.asc())
        elif sort == "newest":
            base = base.order_by(Product.is_new.desc(), Product.created_at.desc(), Product.name.asc())
        else:
            base = base.order_by(Product.legacy_id.asc().nullslast(), Product.name.asc())

        stmt = base.options(*PRODUCT_LOADS).limit(limit).offset(offset)
        return list(self.db.scalars(stmt).unique().all()), total

    def get_product(self, identifier: str) -> Product | None:
        predicates = [Product.slug == identifier]
        try:
            predicates.append(Product.id == UUID(identifier))
        except (ValueError, TypeError):
            pass
        if identifier.isdigit():
            predicates.append(Product.legacy_id == int(identifier))

        stmt = select(Product).where(Product.is_active.is_(True), or_(*predicates)).options(*PRODUCT_LOADS)
        return self.db.scalar(stmt)

    def related_products(self, product: Product, limit: int = 4) -> list[Product]:
        stmt = (
            select(Product)
            .where(
                Product.is_active.is_(True),
                Product.category_id == product.category_id,
                Product.id != product.id,
            )
            .order_by(Product.is_new.desc(), Product.legacy_id.asc().nullslast(), Product.name.asc())
            .options(*PRODUCT_LOADS)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).unique().all())
