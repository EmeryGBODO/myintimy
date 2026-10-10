from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

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
        stmt = (
            select(ProductVariant)
            .where(ProductVariant.is_active.is_(True), or_(*predicates))
            .options(joinedload(ProductVariant.product), joinedload(ProductVariant.color), joinedload(ProductVariant.size))
            .with_for_update()
        )
        return self.db.scalar(stmt)

    def add_movement(self, movement: InventoryMovement) -> None:
        self.db.add(movement)
