from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payments import PaymentTransaction, PaymentWebhookEvent


class PaymentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, payment_id: UUID, *, for_update: bool = False) -> PaymentTransaction | None:
        stmt = select(PaymentTransaction).where(PaymentTransaction.id == payment_id)
        if for_update:
            stmt = stmt.with_for_update(of=PaymentTransaction)
        return self.db.scalar(stmt)

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

    def list_due_for_expiry(self, *, now: datetime, limit: int = 100) -> list[UUID]:
        stmt = (
            select(PaymentTransaction.id)
            .where(
                PaymentTransaction.expires_at.is_not(None),
                PaymentTransaction.expires_at <= now,
                PaymentTransaction.status.in_(["awaiting_customer_action", "processing"]),
            )
            .order_by(PaymentTransaction.expires_at.asc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def list_reconcilable(self, *, provider: str, limit: int = 100) -> list[UUID]:
        stmt = (
            select(PaymentTransaction.id)
            .where(
                PaymentTransaction.provider == provider,
                PaymentTransaction.provider_transaction_id.is_not(None),
                PaymentTransaction.status.in_(["awaiting_customer_action", "processing"]),
            )
            .order_by(PaymentTransaction.updated_at.asc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def get_webhook_event(self, *, provider: str, event_key: str) -> PaymentWebhookEvent | None:
        return self.db.scalar(
            select(PaymentWebhookEvent).where(
                PaymentWebhookEvent.provider == provider,
                PaymentWebhookEvent.event_key == event_key,
            )
        )

    def add_webhook_event(self, event: PaymentWebhookEvent) -> None:
        self.db.add(event)
