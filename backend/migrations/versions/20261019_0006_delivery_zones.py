"""Persistance des zones de livraison et tarification configurable

Revision ID: 20261019_0006
Revises: 20261013_0005
Create Date: 2026-10-19
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20261019_0006"
down_revision: str | None = "87776f2d7bbe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "delivery_zones",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("fee_xof", sa.Integer(), nullable=False),
        sa.Column("free_shipping_threshold_xof", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("fee_xof >= 0", name="ck_delivery_zones_fee_non_negative"),
        sa.CheckConstraint("free_shipping_threshold_xof IS NULL OR free_shipping_threshold_xof >= 0", name="ck_delivery_zones_threshold_non_negative"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_delivery_zones_name"),
    )
    op.create_index("ix_delivery_zones_code", "delivery_zones", ["code"], unique=True)
    op.create_index("ix_delivery_zones_is_active", "delivery_zones", ["is_active"], unique=False)

    op.add_column("orders", sa.Column("delivery_zone_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_orders_delivery_zone", "orders", "delivery_zones", ["delivery_zone_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_orders_delivery_zone_id", "orders", ["delivery_zone_id"], unique=False)


def downgrade() -> None:
    op.drop_constraint("fk_orders_delivery_zone", "orders", type_="foreignkey")
    op.drop_index("ix_orders_delivery_zone_id", table_name="orders")
    op.drop_column("orders", "delivery_zone_id")
    op.drop_index("ix_delivery_zones_is_active", table_name="delivery_zones")
    op.drop_index("ix_delivery_zones_code", table_name="delivery_zones")
    op.drop_table("delivery_zones")

