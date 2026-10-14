"""client accounts, addresses, favorites and order ownership

Revision ID: 20261013_0005
Revises: 20261012_0004
Create Date: 2026-10-13
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261013_0005"
down_revision: str | None = "20261012_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customer_users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=180), nullable=False),
        sa.Column("phone", sa.String(length=60), nullable=True),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customer_users_email", "customer_users", ["email"], unique=True)
    op.create_index("ix_customer_users_is_active", "customer_users", ["is_active"], unique=False)

    op.create_table(
        "customer_addresses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("recipient_name", sa.String(length=180), nullable=False),
        sa.Column("phone", sa.String(length=60), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("area", sa.String(length=160), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customer_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customer_addresses_customer_id", "customer_addresses", ["customer_id"], unique=False)
    op.create_index("ix_customer_addresses_customer_default", "customer_addresses", ["customer_id", "is_default"], unique=False)

    op.create_table(
        "customer_favorites",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customer_users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("customer_id", "product_id", name="uq_customer_favorite_product"),
    )
    op.create_index("ix_customer_favorites_customer_id", "customer_favorites", ["customer_id"], unique=False)
    op.create_index("ix_customer_favorites_product_id", "customer_favorites", ["product_id"], unique=False)

    op.create_table(
        "customer_password_reset_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customer_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customer_password_reset_tokens_customer_id", "customer_password_reset_tokens", ["customer_id"], unique=False)
    op.create_index("ix_customer_password_reset_tokens_token_hash", "customer_password_reset_tokens", ["token_hash"], unique=True)
    op.create_index("ix_customer_reset_customer_created", "customer_password_reset_tokens", ["customer_id", "created_at"], unique=False)

    op.add_column("orders", sa.Column("customer_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_orders_customer_id", "orders", "customer_users", ["customer_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_orders_customer_id", table_name="orders")
    op.drop_constraint("fk_orders_customer_id", "orders", type_="foreignkey")
    op.drop_column("orders", "customer_id")
    op.drop_index("ix_customer_reset_customer_created", table_name="customer_password_reset_tokens")
    op.drop_index("ix_customer_password_reset_tokens_token_hash", table_name="customer_password_reset_tokens")
    op.drop_index("ix_customer_password_reset_tokens_customer_id", table_name="customer_password_reset_tokens")
    op.drop_table("customer_password_reset_tokens")
    op.drop_index("ix_customer_favorites_product_id", table_name="customer_favorites")
    op.drop_index("ix_customer_favorites_customer_id", table_name="customer_favorites")
    op.drop_table("customer_favorites")
    op.drop_index("ix_customer_addresses_customer_default", table_name="customer_addresses")
    op.drop_index("ix_customer_addresses_customer_id", table_name="customer_addresses")
    op.drop_table("customer_addresses")
    op.drop_index("ix_customer_users_is_active", table_name="customer_users")
    op.drop_index("ix_customer_users_email", table_name="customer_users")
    op.drop_table("customer_users")
