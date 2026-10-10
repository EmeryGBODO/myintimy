from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Category(TimestampMixin, Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    subtitle: Mapped[str] = mapped_column(Text, nullable=False, default="")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    products: Mapped[list[Product]] = relationship(back_populates="category")


class Color(TimestampMixin, Base):
    __tablename__ = "colors"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    hex_value: Mapped[str] = mapped_column(String(7), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    variants: Mapped[list[ProductVariant]] = relationship(back_populates="color")


class Size(TimestampMixin, Base):
    __tablename__ = "sizes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(60), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    variants: Mapped[list[ProductVariant]] = relationship(back_populates="size")


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price_xof >= 0", name="ck_products_price_non_negative"),
        Index("ix_products_category_active", "category_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id: Mapped[int | None] = mapped_column(Integer, unique=True, nullable=True, index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, nullable=False, index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    type: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    price_xof: Mapped[int] = mapped_column(Integer, nullable=False)
    tag: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_new: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    material: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    category: Mapped[Category] = relationship(back_populates="products")
    variants: Mapped[list[ProductVariant]] = relationship(back_populates="product", cascade="all, delete-orphan")
    images: Mapped[list[ProductImage]] = relationship(back_populates="product", cascade="all, delete-orphan")


class ProductVariant(TimestampMixin, Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        UniqueConstraint("product_id", "color_id", "size_id", name="uq_product_variant_dimensions"),
        CheckConstraint("stock_quantity >= 0", name="ck_variants_stock_non_negative"),
        CheckConstraint("reserved_quantity >= 0", name="ck_variants_reserved_non_negative"),
        CheckConstraint("reserved_quantity <= stock_quantity", name="ck_variants_reserved_lte_stock"),
        CheckConstraint("price_xof IS NULL OR price_xof >= 0", name="ck_variants_price_non_negative"),
        Index("ix_variants_product_active", "product_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    color_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("colors.id", ondelete="RESTRICT"), nullable=False)
    size_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sizes.id", ondelete="RESTRICT"), nullable=True)
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    price_xof: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserved_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    product: Mapped[Product] = relationship(back_populates="variants")
    color: Mapped[Color] = relationship(back_populates="variants")
    size: Mapped[Size | None] = relationship(back_populates="variants")
    movements: Mapped[list[InventoryMovement]] = relationship(back_populates="variant", cascade="all, delete-orphan")

    @property
    def available_quantity(self) -> int:
        return max(0, self.stock_quantity - self.reserved_quantity)


class ProductImage(TimestampMixin, Base):
    __tablename__ = "product_images"
    __table_args__ = (
        UniqueConstraint("product_id", "position", name="uq_product_image_position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    color_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("colors.id", ondelete="SET NULL"), nullable=True)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    alt_text: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    product: Mapped[Product] = relationship(back_populates="images")
    color: Mapped[Color | None] = relationship()


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint("quantity_delta <> 0", name="ck_inventory_delta_non_zero"),
        CheckConstraint("quantity_after >= 0", name="ck_inventory_after_non_negative"),
        Index("ix_inventory_variant_created", "variant_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(40), nullable=False)
    quantity_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(240), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    variant: Mapped[ProductVariant] = relationship(back_populates="movements")
