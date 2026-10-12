"""Ajoute les commandes et leur historique.

Revision ID: 20261012_0004
Revises: 20261009_0003
Create Date: 2026-10-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261012_0004"
down_revision: str | None = "20261009_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reference", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("payment_method", sa.String(length=40), nullable=False),
        sa.Column("payment_status", sa.String(length=32), nullable=False),
        sa.Column("customer_name", sa.String(length=180), nullable=False),
        sa.Column("customer_phone", sa.String(length=60), nullable=False),
        sa.Column("customer_email", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("area", sa.String(length=160), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("neutral_packaging", sa.Boolean(), nullable=False),
        sa.Column("subtotal_xof", sa.Integer(), nullable=False),
        sa.Column("shipping_xof", sa.Integer(), nullable=False),
        sa.Column("total_xof", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("subtotal_xof >= 0", name="ck_orders_subtotal_non_negative"),
        sa.CheckConstraint("shipping_xof >= 0", name="ck_orders_shipping_non_negative"),
        sa.CheckConstraint("total_xof >= 0", name="ck_orders_total_non_negative"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orders_reference", "orders", ["reference"], unique=True)
    op.create_index("ix_orders_status", "orders", ["status"], unique=False)
    op.create_index("ix_orders_customer_phone", "orders", ["customer_phone"], unique=False)
    op.create_index("ix_orders_customer_email", "orders", ["customer_email"], unique=False)
    op.create_index("ix_orders_status_created", "orders", ["status", "created_at"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("variant_id", sa.Uuid(), nullable=False),
        sa.Column("product_name", sa.String(length=180), nullable=False),
        sa.Column("product_slug", sa.String(length=180), nullable=False),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("color_name", sa.String(length=100), nullable=False),
        sa.Column("color_slug", sa.String(length=60), nullable=False),
        sa.Column("size_code", sa.String(length=30), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_xof", sa.Integer(), nullable=False),
        sa.Column("line_total_xof", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        sa.CheckConstraint("unit_price_xof >= 0", name="ck_order_items_price_non_negative"),
        sa.CheckConstraint("line_total_xof >= 0", name="ck_order_items_total_non_negative"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["variant_id"], ["product_variants.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_order", "order_items", ["order_id"], unique=False)
    op.create_index("ix_order_items_variant", "order_items", ["variant_id"], unique=False)

    op.create_table(
        "order_status_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("from_status", sa.String(length=32), nullable=True),
        sa.Column("to_status", sa.String(length=32), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_status_history_order_created", "order_status_history", ["order_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_order_status_history_order_created", table_name="order_status_history")
    op.drop_table("order_status_history")
    op.drop_index("ix_order_items_variant", table_name="order_items")
    op.drop_index("ix_order_items_order", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_status_created", table_name="orders")
    op.drop_index("ix_orders_customer_email", table_name="orders")
    op.drop_index("ix_orders_customer_phone", table_name="orders")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_reference", table_name="orders")
    op.drop_table("orders")
