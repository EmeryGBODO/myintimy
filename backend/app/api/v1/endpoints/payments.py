from __future__ import annotations

import hmac
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.exceptions import ApiException
from app.core.rate_limit import limit_request
from app.repositories.orders import OrderRepository
from app.schemas.orders import OrderOut
from app.schemas.payments import KkiapayConfigOut, KkiapayVerifyIn, KkiapayWebhookIn
from app.services.kkiapay import KkiapayGateway
from app.services.payments import PaymentProvider, PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/kkiapay/config", response_model=KkiapayConfigOut)
def kkiapay_config():
    return KkiapayGateway().public_config()


@router.post("/kkiapay/verify", response_model=OrderOut)
def verify_kkiapay_payment(payload: KkiapayVerifyIn, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    limit_request(
        request,
        scope="payment-verify",
        discriminator=str(payload.payment_id),
        limit=settings.payment_verify_ip_max_attempts,
        window_seconds=settings.payment_verify_ip_window_seconds,
    )
    service = PaymentService(db)
    payment = service.get_payment_for_update(payload.payment_id)
    if payment.provider != PaymentProvider.KKIAPAY:
        raise ApiException(status_code=409, code="PAYMENT_PROVIDER_MISMATCH", message="Ce paiement n'est pas géré par Kkiapay.")

    service.begin_provider_verification(
        payment,
        transaction_id=payload.transaction_id,
        count_attempt=True,
    )
    db.commit()

    try:
        verification = KkiapayGateway().verify_transaction(payload.transaction_id.strip())
    except Exception:
        payment = service.get_payment_for_update(payload.payment_id)
        service.mark_verification_pending(payment)
        db.commit()
        raise

    payment = service.get_payment_for_update(payload.payment_id)
    try:
        order = service.apply_provider_verification(
            payment,
            transaction_id=verification.transaction_id,
            status=verification.status,
            amount_xof=verification.amount_xof,
            source=verification.source,
            partner_id=verification.partner_id,
            failure_code=verification.failure_code,
            failure_message=verification.failure_message,
        )
    except ApiException as exc:
        if exc.code == "PAYMENT_NOT_FINAL":
            db.commit()
        else:
            db.rollback()
        raise

    db.commit()
    return OrderRepository(db).get_by_id(order.id)


@router.post("/kkiapay/webhook", status_code=200)
def kkiapay_webhook(
    payload: KkiapayWebhookIn,
    db: Session = Depends(get_db),
    x_kkiapay_secret: str | None = Header(default=None),
):
    settings = get_settings()
    expected = settings.kkiapay_webhook_secret.strip()
    if not expected or not x_kkiapay_secret or not hmac.compare_digest(x_kkiapay_secret, expected):
        raise ApiException(status_code=401, code="INVALID_WEBHOOK_SIGNATURE", message="Signature webhook Kkiapay invalide.")

    if not payload.partner_id:
        raise ApiException(status_code=422, code="PAYMENT_PARTNER_REQUIRED", message="Référence partenaire absente du webhook.")

    try:
        payment_id = UUID(payload.partner_id)
    except ValueError as exc:
        raise ApiException(status_code=422, code="PAYMENT_PARTNER_INVALID", message="Référence partenaire invalide.") from exc

    service = PaymentService(db)
    payment = service.get_payment_for_update(payment_id)
    if payment.provider != PaymentProvider.KKIAPAY:
        raise ApiException(status_code=409, code="PAYMENT_PROVIDER_MISMATCH", message="Ce paiement n'est pas géré par Kkiapay.")

    normalized_payload = payload.model_dump(by_alias=True, mode="json")
    event_key, payload_hash = service.webhook_fingerprint(normalized_payload)
    event, already_processed = service.get_or_create_webhook_event(
        payment=payment,
        event_key=event_key,
        event_type=payload.event,
        provider_transaction_id=payload.transaction_id,
        payload_sha256=payload_hash,
    )
    if already_processed:
        return {"ok": True, "duplicate": True}

    service.begin_provider_verification(
        payment,
        transaction_id=payload.transaction_id,
        count_attempt=False,
    )
    db.commit()

    try:
        verification = KkiapayGateway().verify_transaction(payload.transaction_id)
    except ApiException as exc:
        payment = service.get_payment_for_update(payment_id)
        service.mark_verification_pending(payment)
        event = service.repository.get_webhook_event(provider=PaymentProvider.KKIAPAY, event_key=event_key)
        if event:
            service.mark_webhook_failed(event, error_code=exc.code)
        db.commit()
        raise

    payment = service.get_payment_for_update(payment_id)
    event = service.repository.get_webhook_event(provider=PaymentProvider.KKIAPAY, event_key=event_key)
    try:
        service.apply_provider_verification(
            payment,
            transaction_id=verification.transaction_id,
            status=verification.status,
            amount_xof=verification.amount_xof,
            source=verification.source,
            partner_id=verification.partner_id,
            failure_code=verification.failure_code,
            failure_message=verification.failure_message,
        )
    except ApiException as exc:
        if event:
            service.mark_webhook_failed(event, error_code=exc.code)
        db.commit()
        raise

    if event:
        service.mark_webhook_processed(event)
    db.commit()
    return {"ok": True}
