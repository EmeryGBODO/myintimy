from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import Product
from app.models.client import CustomerAddress, CustomerFavorite, CustomerPasswordResetToken, CustomerUser
from app.models.orders import Order


class CustomerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> CustomerUser | None:
        return self.db.scalar(select(CustomerUser).where(CustomerUser.email == email.strip().lower()))

    def get(self, customer_id: UUID) -> CustomerUser | None:
        return self.db.get(CustomerUser, customer_id)

    def list_addresses(self, customer_id: UUID) -> list[CustomerAddress]:
        stmt = select(CustomerAddress).where(CustomerAddress.customer_id == customer_id).order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.asc())
        return list(self.db.scalars(stmt))

    def get_address(self, customer_id: UUID, address_id: UUID) -> CustomerAddress | None:
        return self.db.scalar(select(CustomerAddress).where(CustomerAddress.id == address_id, CustomerAddress.customer_id == customer_id))

    def clear_default_addresses(self, customer_id: UUID, *, except_id: UUID | None = None) -> None:
        for address in self.list_addresses(customer_id):
            if address.is_default and address.id != except_id:
                address.is_default = False

    def list_favorites(self, customer_id: UUID) -> list[CustomerFavorite]:
        stmt = (
            select(CustomerFavorite)
            .where(CustomerFavorite.customer_id == customer_id)
            .options(selectinload(CustomerFavorite.product))
            .order_by(CustomerFavorite.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_favorite(self, customer_id: UUID, product_id: UUID) -> CustomerFavorite | None:
        return self.db.scalar(select(CustomerFavorite).where(CustomerFavorite.customer_id == customer_id, CustomerFavorite.product_id == product_id))

    def get_product(self, identifier: str) -> Product | None:
        raw = identifier.strip()
        clauses = [Product.slug == raw]
        try:
            clauses.append(Product.id == UUID(raw))
        except ValueError:
            pass
        if raw.isdigit():
            clauses.append(Product.legacy_id == int(raw))
        from sqlalchemy import or_
        return self.db.scalar(select(Product).where(or_(*clauses), Product.is_active.is_(True)))

    def get_reset_token(self, token_hash: str) -> CustomerPasswordResetToken | None:
        return self.db.scalar(select(CustomerPasswordResetToken).where(CustomerPasswordResetToken.token_hash == token_hash))

    def list_orders(self, customer_id: UUID, *, limit: int = 100, offset: int = 0) -> list[Order]:
        stmt = (
            select(Order)
            .where(Order.customer_id == customer_id)
            .options(selectinload(Order.items), selectinload(Order.history))
            .order_by(Order.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.scalars(stmt).unique())

    def get_order(self, customer_id: UUID, reference: str) -> Order | None:
        stmt = (
            select(Order)
            .where(Order.customer_id == customer_id, Order.reference == reference.strip().upper())
            .options(selectinload(Order.items), selectinload(Order.history))
        )
        return self.db.scalar(stmt)
