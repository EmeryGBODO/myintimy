from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("subtotal_xof >= 0", name="ck_orders_subtotal_non_negative"),
        CheckConstraint("shipping_xof >= 0", name="ck_orders_shipping_non_negative"),
        CheckConstraint("total_xof >= 0", name="ck_orders_total_non_negative"),
        Index("ix_orders_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    payment_method: Mapped[str] = mapped_column(String(40), nullable=False)
    payment_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")

    customer_name: Mapped[str] = mapped_column(String(180), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    area: Mapped[str] = mapped_column(String(160), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    neutral_packaging: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    subtotal_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    shipping_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    total_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="XOF")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items: Mapped[list[OrderItem]] = relationship(back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.created_at")
    history: Mapped[list[OrderStatusHistory]] = relationship(back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint("unit_price_xof >= 0", name="ck_order_items_price_non_negative"),
        CheckConstraint("line_total_xof >= 0", name="ck_order_items_total_non_negative"),
        Index("ix_order_items_order", "order_id"),
        Index("ix_order_items_variant", "variant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False)

    product_name: Mapped[str] = mapped_column(String(180), nullable=False)
    product_slug: Mapped[str] = mapped_column(String(180), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    color_name: Mapped[str] = mapped_column(String(100), nullable=False)
    color_slug: Mapped[str] = mapped_column(String(60), nullable=False)
    size_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order: Mapped[Order] = relationship(back_populates="items")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    __table_args__ = (Index("ix_order_status_history_order_created", "order_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_status: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order: Mapped[Order] = relationship(back_populates="history")
