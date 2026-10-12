from __future__ import annotations

from uuid import UUID

from sqlalchemy.dialects import postgresql

from app.repositories.inventory import InventoryRepository


class RecordingSession:
    def __init__(self) -> None:
        self.statement = None

    def scalar(self, statement):
        self.statement = statement
        return None


def test_variant_lock_targets_only_product_variants_on_postgresql():
    session = RecordingSession()
    variant_id = UUID("afb7996a-ab26-4071-9d44-561609398e22")

    InventoryRepository(session).get_variant_for_update(variant_id)

    sql = str(
        session.statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )

    assert "LEFT OUTER JOIN" not in sql.upper()
    assert "FOR UPDATE OF product_variants" in sql
