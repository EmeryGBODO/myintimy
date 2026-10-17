from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest

from app.core.exceptions import ApiException
from app.db.session import SessionLocal
from app.models.catalog import ProductVariant
from app.models.orders import Order
from app.models.payments import PaymentTransaction, PaymentWebhookEvent
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


def _mobile_payload(variant_id: str) -> dict:
    payload = _payload(variant_id)
    payload["payment_method"] = "mobile_money"
    return payload


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
    assert payment["expires_at"] is None

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


def test_mobile_money_order_waits_for_operator_confirmation_and_has_expiry(client, seeded_db):
    _enable_kkiapay()
    variant = _variant(client)

    response = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending_payment"
    assert body["payment_status"] == "pending"
    assert body["payment_method"] == PaymentMethod.MOBILE_MONEY
    assert len(body["payments"]) == 1
    assert body["payments"][0]["provider"] == PaymentProvider.KKIAPAY
    assert body["payments"][0]["status"] == PaymentStatus.AWAITING_CUSTOMER_ACTION
    assert body["payments"][0]["expires_at"] is not None
    assert body["payments"][0]["requires_review"] is False


def test_verified_kkiapay_success_confirms_order_only_after_provider_check(client, seeded_db, monkeypatch):
    from app.services.kkiapay import KkiapayGateway, KkiapayVerification

    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    assert created.status_code == 201
    payment_id = created.json()["payments"][0]["id"]

    def fake_verify(self, transaction_id: str):
        return KkiapayVerification(
            transaction_id=transaction_id,
            status="SUCCESS",
            amount_xof=created.json()["total_xof"],
            source="MOBILE_MONEY",
            partner_id=payment_id,
        )

    monkeypatch.setattr(KkiapayGateway, "verify_transaction", fake_verify)
    verified = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-CONFIRMED"},
    )

    assert verified.status_code == 200
    body = verified.json()
    assert body["status"] == "confirmed"
    assert body["payment_status"] == "paid"
    assert body["payments"][0]["status"] == PaymentStatus.SUCCEEDED
    assert body["payments"][0]["provider_transaction_id"] == "KKIA-CONFIRMED"
    assert body["payments"][0]["verification_attempts"] == 1
    assert body["payments"][0]["requires_review"] is False
    assert any("prestataire" in (entry["note"] or "") for entry in body["history"])


def test_kkiapay_webhook_is_server_verified_audited_and_idempotent(client, seeded_db, monkeypatch):
    from app.services.kkiapay import KkiapayGateway, KkiapayVerification

    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    assert created.status_code == 201
    body = created.json()
    payment_id = body["payments"][0]["id"]
    calls = {"count": 0}

    def fake_verify(self, transaction_id: str):
        calls["count"] += 1
        return KkiapayVerification(
            transaction_id=transaction_id,
            status="SUCCESS",
            amount_xof=body["total_xof"],
            source="MOBILE_MONEY",
            partner_id=payment_id,
        )

    monkeypatch.setattr(KkiapayGateway, "verify_transaction", fake_verify)

    payload = {
        "transactionId": "KKIA-WEBHOOK-001",
        "isPaymentSucces": True,
        "account": "22997000000",
        "label": body["reference"],
        "method": "MOBILE_MONEY",
        # This value is intentionally wrong: the backend must use server verification.
        "amount": 1,
        "fees": 100,
        "partnerId": payment_id,
        "performedAt": "2026-10-15T20:00:00Z",
        "event": "transaction.success",
    }

    rejected = client.post("/api/v1/payments/kkiapay/webhook", json=payload)
    assert rejected.status_code == 401

    headers = {"x-kkiapay-secret": "webhook-test"}
    first = client.post("/api/v1/payments/kkiapay/webhook", json=payload, headers=headers)
    second = client.post("/api/v1/payments/kkiapay/webhook", json=payload, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["duplicate"] is True
    assert calls["count"] == 1

    with SessionLocal() as db:
        order = db.get(Order, UUID(body["id"]))
        payment = db.get(PaymentTransaction, UUID(payment_id))
        events = db.query(PaymentWebhookEvent).all()
        assert order.status == "confirmed"
        assert order.payment_status == "paid"
        assert payment.status == PaymentStatus.SUCCEEDED
        assert payment.provider_transaction_id == "KKIA-WEBHOOK-001"
        assert len(events) == 1
        assert events[0].status == "processed"
        assert len(events[0].payload_sha256) == 64


def test_kkiapay_rejects_amount_mismatch_from_server_verification(client, seeded_db, monkeypatch):
    from app.services.kkiapay import KkiapayGateway, KkiapayVerification

    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    payment_id = created.json()["payments"][0]["id"]

    monkeypatch.setattr(
        KkiapayGateway,
        "verify_transaction",
        lambda self, transaction_id: KkiapayVerification(
            transaction_id=transaction_id,
            status="SUCCESS",
            amount_xof=1,
            source="MOBILE_MONEY",
            partner_id=payment_id,
        ),
    )
    response = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-WRONG-AMOUNT"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PAYMENT_AMOUNT_MISMATCH"


def test_kkiapay_requires_matching_partner_id(client, seeded_db, monkeypatch):
    from app.services.kkiapay import KkiapayGateway, KkiapayVerification

    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    payment_id = created.json()["payments"][0]["id"]

    monkeypatch.setattr(
        KkiapayGateway,
        "verify_transaction",
        lambda self, transaction_id: KkiapayVerification(
            transaction_id=transaction_id,
            status="SUCCESS",
            amount_xof=created.json()["total_xof"],
            source="MOBILE_MONEY",
            partner_id="wrong-partner",
        ),
    )
    response = client.post(
        "/api/v1/payments/kkiapay/verify",
        json={"payment_id": payment_id, "transaction_id": "KKIA-WRONG-PARTNER"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PAYMENT_PARTNER_MISMATCH"


def test_expired_payment_releases_stock_reservation_and_cancels_order(client, seeded_db):
    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    assert created.status_code == 201
    body = created.json()
    payment_id = UUID(body["payments"][0]["id"])
    variant_id = UUID(variant["id"])

    with SessionLocal() as db:
        stored_variant = db.get(ProductVariant, variant_id)
        assert stored_variant.reserved_quantity == 1
        payment = db.get(PaymentTransaction, payment_id)
        payment.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()

    with SessionLocal() as db:
        service = PaymentService(db)
        payment = service.get_payment_for_update(payment_id)
        assert service.expire_payment(payment) is True
        db.commit()

    with SessionLocal() as db:
        order = db.get(Order, UUID(body["id"]))
        payment = db.get(PaymentTransaction, payment_id)
        stored_variant = db.get(ProductVariant, variant_id)
        assert payment.status == PaymentStatus.EXPIRED
        assert order.status == "cancelled"
        assert order.payment_status == "expired"
        assert stored_variant.reserved_quantity == 0


def test_late_success_after_expiry_requires_manual_review(client, seeded_db):
    _enable_kkiapay()
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    body = created.json()
    payment_id = UUID(body["payments"][0]["id"])

    with SessionLocal() as db:
        service = PaymentService(db)
        payment = service.get_payment_for_update(payment_id)
        payment.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        service.expire_payment(payment)
        db.commit()

    with SessionLocal() as db:
        service = PaymentService(db)
        payment = service.get_payment_for_update(payment_id)
        order = service.apply_provider_verification(
            payment,
            transaction_id="KKIA-LATE-SUCCESS",
            status="SUCCESS",
            amount_xof=payment.amount_xof,
            source="MOBILE_MONEY",
            partner_id=str(payment.id),
        )
        db.commit()
        assert payment.status == PaymentStatus.SUCCEEDED
        assert payment.requires_review is True
        assert order.status == "cancelled"
        assert order.payment_status == "paid_review"


def test_verification_attempts_are_limited(client, seeded_db):
    settings = _enable_kkiapay()
    settings.payment_verify_max_attempts = 1
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_mobile_payload(variant["id"]))
    payment_id = UUID(created.json()["payments"][0]["id"])

    with SessionLocal() as db:
        service = PaymentService(db)
        payment = service.get_payment_for_update(payment_id)
        service.begin_provider_verification(payment, transaction_id="KKIA-RATE-LIMIT", count_attempt=True)
        db.commit()

    with SessionLocal() as db:
        service = PaymentService(db)
        payment = service.get_payment_for_update(payment_id)
        with pytest.raises(ApiException) as exc:
            service.begin_provider_verification(payment, transaction_id="KKIA-RATE-LIMIT", count_attempt=True)
        assert exc.value.status_code == 429
        assert exc.value.code == "PAYMENT_VERIFICATION_LIMIT"


def test_kkiapay_gateway_uses_official_http_contract(monkeypatch):
    import httpx

    from app.services.kkiapay import KkiapayGateway

    settings = _enable_kkiapay()
    settings.kkiapay_sandbox = True
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "status": "SUCCESS",
                "amount": 2500,
                "source": "MOBILE_MONEY",
                "transactionId": "TX-HTTP-001",
                "partnerId": "partner-001",
            }

    def fake_post(url, *, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(httpx, "post", fake_post)

    result = KkiapayGateway().verify_transaction("TX-HTTP-001")

    assert captured["url"] == "https://api-sandbox.kkiapay.me/api/v1/transactions/status"
    assert captured["json"] == {"transactionId": "TX-HTTP-001"}
    assert captured["headers"]["X-API-KEY"] == "public-test"
    assert captured["headers"]["X-PRIVATE-KEY"] == "private-test"
    assert captured["headers"]["X-SECRET-KEY"] == "secret-test"
    assert captured["timeout"] == 10.0
    assert result.status == "SUCCESS"
    assert result.amount_xof == 2500
    assert result.source == "MOBILE_MONEY"
