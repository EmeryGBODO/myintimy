from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DeliveryZone(Base):
    """Zone de livraison persistée en base avec sa tarification et son seuil de gratuité."""

    __tablename__ = "delivery_zones"
    __table_args__ = (
        CheckConstraint("fee_xof >= 0", name="ck_delivery_zones_fee_non_negative"),
        CheckConstraint(
            "free_shipping_threshold_xof IS NULL OR free_shipping_threshold_xof >= 0",
            name="ck_delivery_zones_threshold_non_negative",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    fee_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    free_shipping_threshold_xof: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<DeliveryZone {self.name} ({self.code}): {self.fee_xof} FCFA, free={self.free_shipping_threshold_xof}, active={self.is_active}>"
