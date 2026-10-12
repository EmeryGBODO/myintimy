from __future__ import annotations

from collections.abc import Iterable
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import ProductVariant
from app.models.orders import Order


class OrderRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_variants_for_update(self, variant_ids: Iterable[UUID]) -> list[ProductVariant]:
        ids = list(dict.fromkeys(variant_ids))
        if not ids:
            return []
        stmt = (
            select(ProductVariant)
            .where(ProductVariant.id.in_(ids), ProductVariant.is_active.is_(True))
            .with_for_update(of=ProductVariant)
        )
        return list(self.db.scalars(stmt))

    def reference_exists(self, reference: str) -> bool:
        return self.db.scalar(select(Order.id).where(Order.reference == reference).limit(1)) is not None

    def get_by_reference(self, reference: str, *, for_update: bool = False) -> Order | None:
        stmt = (
            select(Order)
            .where(Order.reference == reference)
            .options(selectinload(Order.items), selectinload(Order.history))
        )
        if for_update:
            stmt = stmt.with_for_update(of=Order)
        return self.db.scalar(stmt)

    def get_by_id(self, order_id: UUID, *, for_update: bool = False) -> Order | None:
        stmt = (
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.items), selectinload(Order.history))
        )
        if for_update:
            stmt = stmt.with_for_update(of=Order)
        return self.db.scalar(stmt)

    def list_orders(self, *, q: str | None = None, status: str | None = None, limit: int = 100, offset: int = 0) -> list[Order]:
        stmt = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
        if q:
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(
                or_(
                    Order.reference.ilike(pattern),
                    Order.customer_name.ilike(pattern),
                    Order.customer_phone.ilike(pattern),
                    Order.customer_email.ilike(pattern),
                )
            )
        if status:
            stmt = stmt.where(Order.status == status)
        stmt = stmt.limit(limit).offset(offset)
        return list(self.db.scalars(stmt).unique())
