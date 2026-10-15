"""harden payment lifecycle and webhook audit

Revision ID: 20261015_0007
Revises: 20261015_0006
Create Date: 2026-10-15
"""

from alembic import op
import sqlalchemy as sa

revision = "20261015_0007"
down_revision = "20261015_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payment_transactions", sa.Column("verification_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("payment_transactions", sa.Column("last_verification_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payment_transactions", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payment_transactions", sa.Column("requires_review", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("payment_transactions", sa.Column("review_reason", sa.String(length=500), nullable=True))
    op.create_check_constraint(
        "ck_payment_transactions_verification_attempts_non_negative",
        "payment_transactions",
        "verification_attempts >= 0",
    )
    op.create_index("ix_payment_transactions_expires_at", "payment_transactions", ["expires_at"], unique=False)
    op.create_index(
        "ix_payment_transactions_status_expires",
        "payment_transactions",
        ["status", "expires_at"],
        unique=False,
    )

    op.create_table(
        "payment_webhook_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("payment_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("event_key", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=160), nullable=False),
        sa.Column("payload_sha256", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="received"),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["payment_id"], ["payment_transactions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "event_key", name="uq_payment_webhook_provider_event"),
    )
    op.create_index("ix_payment_webhook_events_payment_id", "payment_webhook_events", ["payment_id"], unique=False)
    op.create_index(
        "ix_payment_webhook_payment_received",
        "payment_webhook_events",
        ["payment_id", "received_at"],
        unique=False,
    )
    op.create_index(
        "ix_payment_webhook_provider_transaction",
        "payment_webhook_events",
        ["provider", "provider_transaction_id"],
        unique=False,
    )
    op.create_index(
        "ix_payment_webhook_status_received",
        "payment_webhook_events",
        ["status", "received_at"],
        unique=False,
    )

    op.alter_column("payment_transactions", "verification_attempts", server_default=None)
    op.alter_column("payment_transactions", "requires_review", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_payment_webhook_status_received", table_name="payment_webhook_events")
    op.drop_index("ix_payment_webhook_provider_transaction", table_name="payment_webhook_events")
    op.drop_index("ix_payment_webhook_payment_received", table_name="payment_webhook_events")
    op.drop_index("ix_payment_webhook_events_payment_id", table_name="payment_webhook_events")
    op.drop_table("payment_webhook_events")

    op.drop_index("ix_payment_transactions_status_expires", table_name="payment_transactions")
    op.drop_index("ix_payment_transactions_expires_at", table_name="payment_transactions")
    op.drop_constraint(
        "ck_payment_transactions_verification_attempts_non_negative",
        "payment_transactions",
        type_="check",
    )
    op.drop_column("payment_transactions", "review_reason")
    op.drop_column("payment_transactions", "requires_review")
    op.drop_column("payment_transactions", "expires_at")
    op.drop_column("payment_transactions", "last_verification_at")
    op.drop_column("payment_transactions", "verification_attempts")
