"""Repair delivery-zone schema when revision 0006 was stamped without its DDL.

Revision ID: 20261023_0007
Revises: 20261019_0006
Create Date: 2026-10-23
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20261023_0007"
down_revision: str | None = "20261019_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _has_delivery_zone_foreign_key() -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(
        foreign_key.get("referred_table") == "delivery_zones"
        and foreign_key.get("constrained_columns") == ["delivery_zone_id"]
        for foreign_key in inspector.get_foreign_keys("orders")
    )


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "delivery_zones" not in inspector.get_table_names():
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
            sa.CheckConstraint(
                "free_shipping_threshold_xof IS NULL OR free_shipping_threshold_xof >= 0",
                name="ck_delivery_zones_threshold_non_negative",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name", name="uq_delivery_zones_name"),
        )

    if not _has_index("delivery_zones", "ix_delivery_zones_code"):
        op.create_index("ix_delivery_zones_code", "delivery_zones", ["code"], unique=True)
    if not _has_index("delivery_zones", "ix_delivery_zones_is_active"):
        op.create_index("ix_delivery_zones_is_active", "delivery_zones", ["is_active"], unique=False)

    if not _has_column("orders", "delivery_zone_id"):
        op.add_column("orders", sa.Column("delivery_zone_id", sa.Uuid(), nullable=True))
    if not _has_delivery_zone_foreign_key():
        op.create_foreign_key(
            "fk_orders_delivery_zone",
            "orders",
            "delivery_zones",
            ["delivery_zone_id"],
            ["id"],
            ondelete="SET NULL",
        )
    if not _has_index("orders", "ix_orders_delivery_zone_id"):
        op.create_index("ix_orders_delivery_zone_id", "orders", ["delivery_zone_id"], unique=False)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "orders" in inspector.get_table_names() and _has_column("orders", "delivery_zone_id"):
        if _has_delivery_zone_foreign_key():
            op.drop_constraint("fk_orders_delivery_zone", "orders", type_="foreignkey")
        if _has_index("orders", "ix_orders_delivery_zone_id"):
            op.drop_index("ix_orders_delivery_zone_id", table_name="orders")
        op.drop_column("orders", "delivery_zone_id")

    if "delivery_zones" in inspector.get_table_names():
        op.drop_table("delivery_zones")
