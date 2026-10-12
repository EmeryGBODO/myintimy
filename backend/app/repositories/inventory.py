from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.catalog import InventoryMovement, ProductVariant


class InventoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_variant_for_update(self, identifier: str | UUID) -> ProductVariant | None:
        predicates = [ProductVariant.sku == str(identifier)]
        try:
            predicates.append(ProductVariant.id == UUID(str(identifier)))
        except (ValueError, TypeError):
            pass

        # Important: do not eager-load nullable relationships in the locking query.
        # PostgreSQL rejects FOR UPDATE when it is applied to the nullable side of
        # an OUTER JOIN. Lock only the product_variants row; relationships can be
        # lazy-loaded later in the same request/session when the response needs them.
        stmt = (
            select(ProductVariant)
            .where(ProductVariant.is_active.is_(True), or_(*predicates))
            .with_for_update(of=ProductVariant)
        )
        return self.db.scalar(stmt)

    def add_movement(self, movement: InventoryMovement) -> None:
        self.db.add(movement)
