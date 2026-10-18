from __future__ import annotations

from uuid import UUID

from sqlalchemy.dialects import postgresql

from app.repositories.orders import OrderRepository
from app.repositories.payments import PaymentRepository


class RecordingScalars:
    def __iter__(self):
        return iter(())


class RecordingSession:
    def __init__(self) -> None:
        self.statement = None

    def scalar(self, statement):
        self.statement = statement
        return None

    def scalars(self, statement):
        self.statement = statement
        return RecordingScalars()


def _postgres_sql(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    ).upper()


def test_order_status_lock_targets_only_orders_row():
    session = RecordingSession()
    OrderRepository(session).get_by_id(UUID("6d7689ef-472b-431c-9bc8-a4636e205a65"), for_update=True)

    sql = _postgres_sql(session.statement)
    assert "FOR UPDATE OF ORDERS" in sql


def test_order_creation_locks_product_variants():
    session = RecordingSession()
    OrderRepository(session).get_variants_for_update([UUID("afb7996a-ab26-4071-9d44-561609398e22")])

    sql = _postgres_sql(session.statement)
    assert "FOR UPDATE OF PRODUCT_VARIANTS" in sql


def test_payment_verification_locks_payment_transaction():
    session = RecordingSession()
    PaymentRepository(session).get_by_id(UUID("51e31ef4-0f82-4124-9f4e-85e6cab612fb"), for_update=True)

    sql = _postgres_sql(session.statement)
    assert "FOR UPDATE OF PAYMENT_TRANSACTIONS" in sql
