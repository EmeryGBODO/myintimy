from __future__ import annotations

import os
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app.core.exceptions import ApiException
from app.db.base import Base
from app.models.catalog import ProductVariant
from app.models.orders import Order
from app.schemas.orders import OrderCreateIn
from app.seeds.catalog import seed_catalog
from app.services.orders import OrderService


TEST_DATABASE_URL = os.getenv("MYINTIMY_TEST_POSTGRES_URL", "").strip()

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="Définir MYINTIMY_TEST_POSTGRES_URL vers une base PostgreSQL dédiée aux tests de concurrence.",
)


def _assert_safe_test_database(url: str) -> None:
    parsed = make_url(url)
    if not parsed.drivername.startswith("postgresql"):
        pytest.fail("MYINTIMY_TEST_POSTGRES_URL doit utiliser PostgreSQL.")
    database = (parsed.database or "").lower()
    if "test" not in database:
        pytest.fail("Par sécurité, le nom de la base PostgreSQL de concurrence doit contenir 'test'.")


def test_two_concurrent_orders_cannot_overreserve_same_variant():
    _assert_safe_test_database(TEST_DATABASE_URL)
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    try:
        with Session() as db:
            seed_catalog(db)
            variant = db.scalar(select(ProductVariant).order_by(ProductVariant.created_at.asc()).limit(1))
            assert variant is not None
            variant_id = variant.id
            initial_stock = variant.stock_quantity
            assert initial_stock >= 2

        # Each order asks for more than half of the physical stock. Exactly one may reserve.
        requested_quantity = (initial_stock // 2) + 1
        barrier = threading.Barrier(2)

        def create_order(index: int) -> str:
            with Session() as db:
                payload = OrderCreateIn(
                    customer_name=f"Concurrent {index}",
                    customer_phone=f"+22901020{index:03d}",
                    customer_email=f"concurrent-{index}@example.com",
                    city="Cotonou",
                    area="Cadjehoun",
                    address="Test concurrence PostgreSQL",
                    neutral_packaging=True,
                    payment_method="cash_on_delivery",
                    items=[{"variant_id": variant_id, "quantity": requested_quantity}],
                )
                barrier.wait(timeout=5)
                try:
                    OrderService(db).create(payload)
                    return "created"
                except ApiException as exc:
                    db.rollback()
                    return exc.code

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(create_order, [1, 2]))

        assert sorted(results) == ["INSUFFICIENT_STOCK", "created"]

        with Session() as db:
            variant = db.get(ProductVariant, variant_id)
            assert variant is not None
            assert variant.stock_quantity == initial_stock
            assert variant.reserved_quantity == requested_quantity
            orders = list(db.scalars(select(Order)))
            assert len(orders) == 1
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
