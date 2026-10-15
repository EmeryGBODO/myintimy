"""payment transactions foundation

Revision ID: 20261015_0006
Revises: 20261013_0005
Create Date: 2026-10-15
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261015_0006"
down_revision: str | None = "20261013_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("method", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("amount_xof", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=160), nullable=True),
        sa.Column("provider_reference", sa.String(length=160), nullable=True),
        sa.Column("checkout_url", sa.Text(), nullable=True),
        sa.Column("failure_code", sa.String(length=120), nullable=True),
        sa.Column("failure_message", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount_xof >= 0", name="ck_payment_transactions_amount_non_negative"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_transaction_id", name="uq_payment_provider_transaction"),
    )
    op.create_index("ix_payment_transactions_idempotency_key", "payment_transactions", ["idempotency_key"], unique=True)
    op.create_index("ix_payment_transactions_order_id", "payment_transactions", ["order_id"], unique=False)
    op.create_index("ix_payment_transactions_order_status", "payment_transactions", ["order_id", "status"], unique=False)
    op.create_index("ix_payment_transactions_provider_status", "payment_transactions", ["provider", "status"], unique=False)
    op.create_index(
        "ix_payment_transactions_provider_transaction_id",
        "payment_transactions",
        ["provider_transaction_id"],
        unique=False,
    )
    op.create_index("ix_payment_transactions_status", "payment_transactions", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_payment_transactions_status", table_name="payment_transactions")
    op.drop_index("ix_payment_transactions_provider_transaction_id", table_name="payment_transactions")
    op.drop_index("ix_payment_transactions_provider_status", table_name="payment_transactions")
    op.drop_index("ix_payment_transactions_order_status", table_name="payment_transactions")
    op.drop_index("ix_payment_transactions_order_id", table_name="payment_transactions")
    op.drop_index("ix_payment_transactions_idempotency_key", table_name="payment_transactions")
    op.drop_table("payment_transactions")
