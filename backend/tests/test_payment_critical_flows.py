from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.core.exceptions import ApiException
from app.db.session import SessionLocal
from app.models.catalog import ProductVariant
from app.models.orders import Order
from app.models.payments import PaymentTransaction, PaymentWebhookEvent
from app.services.kkiapay import KkiapayGateway, KkiapayVerification
from app.services.payments import PaymentService, PaymentStatus


def _variant(client):
    product = client.get("/api/v1/products/1").json()
    return product["variants"][0]


def _enable_kkiapay():
    from app.core.config import get_settings

    settings = get_settings()
    settings.kkiapay_public_key = "public-test"
    settings.kkiapay_private_key = "private-test"
    settings.kkiapay_secret_key = "secret-test"
    settings.kkiapay_webhook_secret = "webhook-test"
    settings.kkiapay_sandbox = True
    settings.payment_session_minutes = 15
    settings.payment_verify_max_attempts = 10
    return settings


def _mobile_payload(variant_id: str, *, quantity: int = 1) -> dict:
    return {
        "customer_name": "Awa QA",
        "customer_phone": "+22901020304",
        "customer_email": "awa-qa@example.com",
        "city": "Cotonou",
        "area": "Cadjehoun",
        "address": "Rue de test",
        "neutral_packaging": True,
        "payment_method": "mobile_money",
        "items": [{"variant_id": variant_id, "quantity": quantity}],
    }


def test_non_final_provider_status_keeps_reservation(client, seeded_db, monkeypatch):
    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    assert created.status_code == 201
    body = created.json()
    payment_id = body["payments"][0]["id"]

    monkeypatch.setattr(
        KkiapayGateway,
        "verify_transaction",
        lambda self, transaction_id: KkiapayVerification(
            transaction_id=transaction_id,
            status="PENDING",
            amount_xof=body["total_xof"],
            source="MOBILE_MONEY",
            partner_id=payment_id,
        ),
    )

    response = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-PENDING-001"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PAYMENT_NOT_FINAL"

    with SessionLocal() as db:
        payment = db.get(PaymentTransaction, UUID(payment_id))
        order = db.get(Order, UUID(body["id"]))
        stored_variant = db.get(ProductVariant, UUID(variant["id"]))
        assert payment.status == PaymentStatus.AWAITING_CUSTOMER_ACTION
        assert order.status == "pending_payment"
        assert order.payment_status == "pending"
        assert stored_variant.reserved_quantity == 1


def test_failed_mobile_money_releases_reservation_once(client, seeded_db, monkeypatch):
    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"], quantity=2))
    body = created.json()
    payment_id = body["payments"][0]["id"]

    monkeypatch.setattr(
        KkiapayGateway,
        "verify_transaction",
        lambda self, transaction_id: KkiapayVerification(
            transaction_id=transaction_id,
            status="FAILED",
            amount_xof=body["total_xof"],
            source="MOBILE_MONEY",
            partner_id=payment_id,
            failure_code="OPERATOR_REJECTED",
            failure_message="Paiement refusé",
        ),
    )

    first = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-FAILED-001"},
    )
    second = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-FAILED-001"},
    )
    assert first.status_code == 200
    assert second.status_code == 200

    with SessionLocal() as db:
        payment = db.get(PaymentTransaction, UUID(payment_id))
        order = db.get(Order, UUID(body["id"]))
        stored_variant = db.get(ProductVariant, UUID(variant["id"]))
        assert payment.status == PaymentStatus.FAILED
        assert payment.failure_code == "OPERATOR_REJECTED"
        assert order.status == "cancelled"
        assert order.payment_status == "failed"
        assert stored_variant.stock_quantity == 12
        assert stored_variant.reserved_quantity == 0
        cancellation_entries = [entry for entry in order.history if entry.to_status == "cancelled"]
        assert len(cancellation_entries) == 1


def test_success_verification_is_idempotent_without_duplicate_order_transition(client, seeded_db, monkeypatch):
    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    body = created.json()
    payment_id = body["payments"][0]["id"]

    monkeypatch.setattr(
        KkiapayGateway,
        "verify_transaction",
        lambda self, transaction_id: KkiapayVerification(
            transaction_id=transaction_id,
            status="SUCCESS",
            amount_xof=body["total_xof"],
            source="MOBILE_MONEY",
            partner_id=payment_id,
        ),
    )

    first = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-SUCCESS-IDEMPOTENT"},
    )
    second = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-SUCCESS-IDEMPOTENT"},
    )
    assert first.status_code == 200
    assert second.status_code == 200

    with SessionLocal() as db:
        order = db.get(Order, UUID(body["id"]))
        payment = db.get(PaymentTransaction, UUID(payment_id))
        stored_variant = db.get(ProductVariant, UUID(variant["id"]))
        assert payment.status == PaymentStatus.SUCCEEDED
        assert order.status == "confirmed"
        assert order.payment_status == "paid"
        assert stored_variant.stock_quantity == 12
        assert stored_variant.reserved_quantity == 1
        confirmations = [
            entry
            for entry in order.history
            if entry.from_status == "pending_payment" and entry.to_status == "confirmed"
        ]
        assert len(confirmations) == 1


def test_provider_transaction_cannot_be_reused_by_another_payment(client, seeded_db, monkeypatch):
    _enable_kkiapay()
    variant = _variant(client)
    first = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    second = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    assert first.status_code == 201
    assert second.status_code == 201

    first_payment = first.json()["payments"][0]["id"]
    second_payment = second.json()["payments"][0]["id"]

    monkeypatch.setattr(
        KkiapayGateway,
        "verify_transaction",
        lambda self, transaction_id: KkiapayVerification(
            transaction_id=transaction_id,
            status="SUCCESS",
            amount_xof=first.json()["total_xof"],
            source="MOBILE_MONEY",
            partner_id=first_payment,
        ),
    )
    confirmed = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": first_payment, "transaction_id": "KKIA-UNIQUE-TX"},
    )
    assert confirmed.status_code == 200

    reused = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": second_payment, "transaction_id": "KKIA-UNIQUE-TX"},
    )
    assert reused.status_code == 409
    assert reused.json()["error"]["code"] == "PAYMENT_TRANSACTION_REUSED"


def test_failed_webhook_can_be_retried_after_transient_provider_error(client, seeded_db, monkeypatch):
    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    body = created.json()
    payment_id = body["payments"][0]["id"]
    calls = {"count": 0}

    def flaky_verify(self, transaction_id: str):
        calls["count"] += 1
        if calls["count"] == 1:
            raise ApiException(
                status_code=502,
                code="KKIAPAY_VERIFICATION_FAILED",
                message="Prestataire temporairement indisponible",
            )
        return KkiapayVerification(
            transaction_id=transaction_id,
            status="SUCCESS",
            amount_xof=body["total_xof"],
            source="MOBILE_MONEY",
            partner_id=payment_id,
        )

    monkeypatch.setattr(KkiapayGateway, "verify_transaction", flaky_verify)
    payload = {
        "transactionId": "KKIA-WEBHOOK-RETRY",
        "isPaymentSucces": True,
        "account": "22997000000",
        "label": body["reference"],
        "method": "MOBILE_MONEY",
        "amount": body["total_xof"],
        "fees": 0,
        "partnerId": payment_id,
        "performedAt": "2026-10-15T20:00:00Z",
        "event": "transaction.success",
    }
    headers = {"x-kkiapay-secret": "webhook-test"}

    first = client.post("/api/v1/payments/kkiapay/webhook", json=payload, headers=headers)
    second = client.post("/api/v1/payments/kkiapay/webhook", json=payload, headers=headers)
    third = client.post("/api/v1/payments/kkiapay/webhook", json=payload, headers=headers)

    assert first.status_code == 502
    assert second.status_code == 200
    assert third.status_code == 200
    assert third.json()["duplicate"] is True
    assert calls["count"] == 2

    with SessionLocal() as db:
        order = db.get(Order, UUID(body["id"]))
        events = db.query(PaymentWebhookEvent).all()
        assert order.status == "confirmed"
        assert order.payment_status == "paid"
        assert len(events) == 1
        assert events[0].status == "processed"
        assert events[0].error_code is None


def test_expire_due_payments_is_idempotent(client, seeded_db):
    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    body = created.json()
    payment_id = UUID(body["payments"][0]["id"])

    with SessionLocal() as db:
        payment = db.get(PaymentTransaction, payment_id)
        payment.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()

    with SessionLocal() as db:
        service = PaymentService(db)
        assert service.expire_due_payments() == 1
        db.commit()

    with SessionLocal() as db:
        service = PaymentService(db)
        assert service.expire_due_payments() == 0
        db.commit()

        order = db.get(Order, UUID(body["id"]))
        stored_variant = db.get(ProductVariant, UUID(variant["id"]))
        assert order.status == "cancelled"
        assert order.payment_status == "expired"
        assert stored_variant.reserved_quantity == 0
        cancellation_entries = [entry for entry in order.history if entry.to_status == "cancelled"]
        assert len(cancellation_entries) == 1
