from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    __table_args__ = (
        CheckConstraint("amount_xof >= 0", name="ck_payment_transactions_amount_non_negative"),
        CheckConstraint("verification_attempts >= 0", name="ck_payment_transactions_verification_attempts_non_negative"),
        UniqueConstraint("provider", "provider_transaction_id", name="uq_payment_provider_transaction"),
        Index("ix_payment_transactions_order_status", "order_id", "status"),
        Index("ix_payment_transactions_provider_status", "provider", "status"),
        Index("ix_payment_transactions_status_expires", "status", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)

    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    method: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    amount_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="XOF")

    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    provider_transaction_id: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    provider_reference: Mapped[str | None] = mapped_column(String(160), nullable=True)
    checkout_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String(120), nullable=True)
    failure_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    verification_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_verification_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    requires_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    review_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    order = relationship("Order", back_populates="payments")
    webhook_events: Mapped[list[PaymentWebhookEvent]] = relationship(
        back_populates="payment", cascade="all, delete-orphan", order_by="PaymentWebhookEvent.received_at"
    )


class PaymentWebhookEvent(Base):
    __tablename__ = "payment_webhook_events"
    __table_args__ = (
        UniqueConstraint("provider", "event_key", name="uq_payment_webhook_provider_event"),
        Index("ix_payment_webhook_payment_received", "payment_id", "received_at"),
        Index("ix_payment_webhook_provider_transaction", "provider", "provider_transaction_id"),
        Index("ix_payment_webhook_status_received", "status", "received_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payment_transactions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    event_key: Mapped[str] = mapped_column(String(64), nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    provider_transaction_id: Mapped[str] = mapped_column(String(160), nullable=False)
    payload_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="received")
    error_code: Mapped[str | None] = mapped_column(String(120), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    payment: Mapped[PaymentTransaction] = relationship(back_populates="webhook_events")
