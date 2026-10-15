from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payments import PaymentTransaction


class PaymentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_idempotency_key(self, key: str) -> PaymentTransaction | None:
        return self.db.scalar(select(PaymentTransaction).where(PaymentTransaction.idempotency_key == key))

    def get_by_provider_transaction_id(self, provider: str, transaction_id: str) -> PaymentTransaction | None:
        return self.db.scalar(
            select(PaymentTransaction).where(
                PaymentTransaction.provider == provider,
                PaymentTransaction.provider_transaction_id == transaction_id,
            )
        )

    def list_for_order(self, order_id: UUID) -> list[PaymentTransaction]:
        stmt = (
            select(PaymentTransaction)
            .where(PaymentTransaction.order_id == order_id)
            .order_by(PaymentTransaction.created_at.asc())
        )
        return list(self.db.scalars(stmt))
