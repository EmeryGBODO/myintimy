from __future__ import annotations

from uuid import UUID

import pytest

from app.core.exceptions import ApiException
from app.db.session import SessionLocal
from app.models.orders import Order
from app.models.payments import PaymentTransaction
from app.services.payments import PaymentMethod, PaymentProvider, PaymentService, PaymentStatus


def _variant(client):
    product = client.get("/api/v1/products/1").json()
    return product["variants"][0]


def _payload(variant_id: str) -> dict:
    return {
        "customer_name": "Awa Paiement",
        "customer_phone": "+22901020304",
        "customer_email": "awa-payment@example.com",
        "city": "Cotonou",
        "area": "Cadjehoun",
        "address": "Rue de test",
        "neutral_packaging": True,
        "payment_method": "cash_on_delivery",
        "items": [{"variant_id": variant_id, "quantity": 1}],
    }


def test_cash_on_delivery_creates_one_payment_transaction(client, seeded_db):
    variant = _variant(client)
    response = client.post("/api/v1/orders", json=_payload(variant["id"]))

    assert response.status_code == 201
    body = response.json()
    assert len(body["payments"]) == 1
    payment = body["payments"][0]
    assert payment["provider"] == PaymentProvider.INTERNAL
    assert payment["method"] == PaymentMethod.CASH_ON_DELIVERY
    assert payment["status"] == PaymentStatus.PENDING
    assert payment["amount_xof"] == body["total_xof"]
    assert payment["currency"] == "XOF"

    with SessionLocal() as db:
        stored = db.query(PaymentTransaction).one()
        assert stored.order_id == UUID(body["id"])
        assert stored.idempotency_key == f"order:{body['reference']}:cash_on_delivery:initial"


def test_cash_on_delivery_registration_is_idempotent(client, seeded_db):
    variant = _variant(client)
    response = client.post("/api/v1/orders", json=_payload(variant["id"]))
    assert response.status_code == 201

    with SessionLocal() as db:
        order = db.get(Order, UUID(response.json()["id"]))
        service = PaymentService(db)
        first = service.register_cash_on_delivery(order)
        second = service.register_cash_on_delivery(order)
        assert first.id == second.id
        assert db.query(PaymentTransaction).count() == 1


def test_idempotency_key_cannot_be_reused_for_another_payment(client, seeded_db):
    variant = _variant(client)
    first_response = client.post("/api/v1/orders", json=_payload(variant["id"]))
    second_response = client.post("/api/v1/orders", json=_payload(variant["id"]))
    assert first_response.status_code == 201
    assert second_response.status_code == 201

    with SessionLocal() as db:
        first = db.get(Order, UUID(first_response.json()["id"]))
        second = db.get(Order, UUID(second_response.json()["id"]))
        service = PaymentService(db)
        key = "checkout-retry-key-001"
        service.create_pending(
            first,
            method=PaymentMethod.MOBILE_MONEY,
            provider="future-provider",
            idempotency_key=key,
        )
        db.flush()

        with pytest.raises(ApiException) as exc:
            service.create_pending(
                second,
                method=PaymentMethod.MOBILE_MONEY,
                provider="future-provider",
                idempotency_key=key,
            )
        assert exc.value.code == "PAYMENT_IDEMPOTENCY_CONFLICT"
