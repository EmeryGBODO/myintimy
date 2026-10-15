from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Mapping, Protocol

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ApiException
from app.models.orders import Order, OrderStatusHistory
from app.models.payments import PaymentTransaction, PaymentWebhookEvent
from app.repositories.orders import OrderRepository
from app.repositories.payments import PaymentRepository


class PaymentProvider:
    INTERNAL = "internal"
    KKIAPAY = "kkiapay"


class PaymentMethod:
    CASH_ON_DELIVERY = "cash_on_delivery"
    MOBILE_MONEY = "mobile_money"


class PaymentStatus:
    PENDING = "pending"
    AWAITING_CUSTOMER_ACTION = "awaiting_customer_action"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

    FINAL = {SUCCEEDED, FAILED, EXPIRED, CANCELLED, REFUNDED}
    ACTIVE = {AWAITING_CUSTOMER_ACTION, PROCESSING}
    ALL = {PENDING, *ACTIVE, *FINAL}


class WebhookStatus:
    RECEIVED = "received"
    PROCESSED = "processed"
    FAILED = "failed"


@dataclass(frozen=True)
class PaymentInitiationRequest:
    order_reference: str
    amount_xof: int
    currency: str
    idempotency_key: str
    customer_name: str
    customer_phone: str
    customer_email: str | None


@dataclass(frozen=True)
class GatewayPayment:
    provider_transaction_id: str
    status: str
    provider_reference: str | None = None
    checkout_url: str | None = None


@dataclass(frozen=True)
class GatewayWebhookEvent:
    event_id: str
    provider_transaction_id: str
    status: str
    amount_xof: int
    currency: str


class PaymentGateway(Protocol):
    provider: str

    def initiate(self, request: PaymentInitiationRequest) -> GatewayPayment:
        """Create a payment with the external provider."""

    def parse_webhook(self, payload: bytes, headers: Mapping[str, str]) -> GatewayWebhookEvent:
        """Validate and normalize a provider webhook payload."""


class PaymentService:
    """Provider-independent payment orchestration and payment-state security."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = PaymentRepository(db)
        self.order_repository = OrderRepository(db)
        self.settings = get_settings()

    @staticmethod
    def initial_idempotency_key(order: Order, method: str) -> str:
        return f"order:{order.reference}:{method}:initial"

    def register_cash_on_delivery(self, order: Order) -> PaymentTransaction:
        key = self.initial_idempotency_key(order, PaymentMethod.CASH_ON_DELIVERY)
        existing = self.repository.get_by_idempotency_key(key)
        if existing:
            self._assert_same_payment(
                existing,
                order=order,
                method=PaymentMethod.CASH_ON_DELIVERY,
                provider=PaymentProvider.INTERNAL,
                amount_xof=order.total_xof,
            )
            return existing

        transaction = PaymentTransaction(
            provider=PaymentProvider.INTERNAL,
            method=PaymentMethod.CASH_ON_DELIVERY,
            status=PaymentStatus.PENDING,
            amount_xof=order.total_xof,
            currency=order.currency,
            idempotency_key=key,
        )
        order.payments.append(transaction)
        return transaction

    def register_mobile_money(self, order: Order) -> PaymentTransaction:
        key = self.initial_idempotency_key(order, PaymentMethod.MOBILE_MONEY)
        existing = self.repository.get_by_idempotency_key(key)
        if existing:
            self._assert_same_payment(
                existing,
                order=order,
                method=PaymentMethod.MOBILE_MONEY,
                provider=PaymentProvider.KKIAPAY,
                amount_xof=order.total_xof,
            )
            return existing

        transaction = PaymentTransaction(
            id=uuid.uuid4(),
            provider=PaymentProvider.KKIAPAY,
            method=PaymentMethod.MOBILE_MONEY,
            status=PaymentStatus.AWAITING_CUSTOMER_ACTION,
            amount_xof=order.total_xof,
            currency=order.currency,
            idempotency_key=key,
            provider_reference=order.reference,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=self.settings.payment_session_minutes),
        )
        order.payments.append(transaction)
        return transaction

    def create_pending(
        self,
        order: Order,
        *,
        method: str,
        provider: str,
        idempotency_key: str,
    ) -> PaymentTransaction:
        key = idempotency_key.strip()
        if not key:
            raise ApiException(status_code=422, code="PAYMENT_IDEMPOTENCY_REQUIRED", message="Une clé d'idempotence est requise.")

        existing = self.repository.get_by_idempotency_key(key)
        if existing:
            self._assert_same_payment(existing, order=order, method=method, provider=provider, amount_xof=order.total_xof)
            return existing

        transaction = PaymentTransaction(
            id=uuid.uuid4(),
            order=order,
            provider=provider,
            method=method,
            status=PaymentStatus.PENDING,
            amount_xof=order.total_xof,
            currency=order.currency,
            idempotency_key=key,
        )
        self.db.add(transaction)
        return transaction

    def get_payment(self, payment_id: uuid.UUID) -> PaymentTransaction:
        payment = self.repository.get_by_id(payment_id)
        if not payment:
            raise ApiException(status_code=404, code="PAYMENT_NOT_FOUND", message="Le paiement demandé n'existe pas.")
        return payment

    def get_payment_for_update(self, payment_id: uuid.UUID) -> PaymentTransaction:
        payment = self.repository.get_by_id(payment_id, for_update=True)
        if not payment:
            raise ApiException(status_code=404, code="PAYMENT_NOT_FOUND", message="Le paiement demandé n'existe pas.")
        return payment

    def begin_provider_verification(
        self,
        payment: PaymentTransaction,
        *,
        transaction_id: str,
        count_attempt: bool,
    ) -> None:
        self._assert_kkiapay_mobile_money(payment)
        txid = transaction_id.strip()
        if not txid:
            raise ApiException(status_code=422, code="PAYMENT_TRANSACTION_REQUIRED", message="La référence prestataire est requise.")

        other = self.repository.get_by_provider_transaction_id(PaymentProvider.KKIAPAY, txid)
        if other and other.id != payment.id:
            raise ApiException(status_code=409, code="PAYMENT_TRANSACTION_REUSED", message="Cette transaction prestataire a déjà été utilisée.")
        if payment.provider_transaction_id and payment.provider_transaction_id != txid:
            raise ApiException(
                status_code=409,
                code="PAYMENT_TRANSACTION_MISMATCH",
                message="Une autre transaction prestataire est déjà associée à ce paiement.",
            )

        if count_attempt:
            if payment.verification_attempts >= self.settings.payment_verify_max_attempts:
                raise ApiException(
                    status_code=429,
                    code="PAYMENT_VERIFICATION_LIMIT",
                    message="Trop de tentatives de vérification ont été effectuées pour ce paiement.",
                )
            payment.verification_attempts += 1
            payment.last_verification_at = datetime.now(timezone.utc)

        payment.provider_transaction_id = txid
        if payment.status == PaymentStatus.AWAITING_CUSTOMER_ACTION:
            payment.status = PaymentStatus.PROCESSING

    def mark_verification_pending(self, payment: PaymentTransaction) -> None:
        if payment.status == PaymentStatus.PROCESSING:
            payment.status = PaymentStatus.AWAITING_CUSTOMER_ACTION

    def apply_provider_verification(
        self,
        payment: PaymentTransaction,
        *,
        transaction_id: str,
        status: str,
        amount_xof: int,
        source: str | None,
        partner_id: str | None,
        failure_code: str | None = None,
        failure_message: str | None = None,
    ) -> Order:
        self._assert_kkiapay_mobile_money(payment)
        normalized_status = status.upper().strip()
        txid = transaction_id.strip()

        if amount_xof != payment.amount_xof:
            raise ApiException(
                status_code=409,
                code="PAYMENT_AMOUNT_MISMATCH",
                message="Le montant confirmé par le prestataire ne correspond pas à la commande.",
            )
        if not source or source.upper() not in {"MOBILE_MONEY", "MOMO"}:
            raise ApiException(
                status_code=409,
                code="PAYMENT_METHOD_MISMATCH",
                message="Le moyen de paiement confirmé ne correspond pas au Mobile Money.",
            )
        if not partner_id or partner_id != str(payment.id):
            raise ApiException(
                status_code=409,
                code="PAYMENT_PARTNER_MISMATCH",
                message="La référence partenaire ne correspond pas à la transaction attendue.",
            )

        self.begin_provider_verification(payment, transaction_id=txid, count_attempt=False)
        order = payment.order
        now = datetime.now(timezone.utc)

        if normalized_status == "SUCCESS":
            if payment.status == PaymentStatus.SUCCEEDED:
                return order

            expired_by_time = self._is_expired(payment, now=now)
            reservation_released = order.status == "cancelled" or order.payment_status in {"expired", "failed"}
            if expired_by_time and order.status == "pending_payment":
                self._release_pending_order(
                    order,
                    payment_status="expired",
                    note="Réservation libérée : délai de paiement Mobile Money expiré",
                )
                reservation_released = True

            payment.status = PaymentStatus.SUCCEEDED
            payment.failure_code = None
            payment.failure_message = None
            payment.completed_at = now

            if reservation_released:
                payment.requires_review = True
                payment.review_reason = "Paiement reçu après libération de la réservation de stock"
                order.payment_status = "paid_review"
                order.history.append(
                    OrderStatusHistory(
                        from_status=order.status,
                        to_status=order.status,
                        note="Paiement reçu après expiration/annulation : revue manuelle requise",
                    )
                )
                return order

            order.payment_status = "paid"
            if order.status == "pending_payment":
                order.history.append(
                    OrderStatusHistory(
                        from_status="pending_payment",
                        to_status="confirmed",
                        note="Paiement Mobile Money confirmé par le prestataire",
                    )
                )
                order.status = "confirmed"
            return order

        if normalized_status == "FAILED":
            if payment.status == PaymentStatus.SUCCEEDED:
                return order
            payment.status = PaymentStatus.FAILED
            payment.failure_code = failure_code
            payment.failure_message = failure_message
            payment.completed_at = now
            self._release_pending_order(
                order,
                payment_status="failed",
                note="Paiement Mobile Money refusé : réservation de stock libérée",
            )
            return order

        self.mark_verification_pending(payment)
        raise ApiException(
            status_code=409,
            code="PAYMENT_NOT_FINAL",
            message="Le paiement est toujours en attente de confirmation par le prestataire.",
        )

    def expire_payment(self, payment: PaymentTransaction, *, now: datetime | None = None) -> bool:
        current = now or datetime.now(timezone.utc)
        if payment.status not in PaymentStatus.ACTIVE or not self._is_expired(payment, now=current):
            return False

        payment.status = PaymentStatus.EXPIRED
        payment.completed_at = current
        self._release_pending_order(
            payment.order,
            payment_status="expired",
            note="Délai de paiement Mobile Money expiré : réservation de stock libérée",
        )
        return True

    def expire_due_payments(self, *, limit: int | None = None) -> int:
        now = datetime.now(timezone.utc)
        ids = self.repository.list_due_for_expiry(
            now=now,
            limit=limit or self.settings.payment_reconcile_batch_size,
        )
        expired = 0
        for payment_id in ids:
            payment = self.get_payment_for_update(payment_id)
            if self.expire_payment(payment, now=now):
                expired += 1
            self.db.commit()
        return expired

    @staticmethod
    def webhook_fingerprint(payload: dict[str, object]) -> tuple[str, str]:
        raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        payload_hash = hashlib.sha256(raw).hexdigest()
        event_material = "|".join(
            str(payload.get(key) or "")
            for key in ("transactionId", "event", "performedAt", "partnerId")
        ).encode("utf-8")
        return hashlib.sha256(event_material).hexdigest(), payload_hash

    def get_or_create_webhook_event(
        self,
        *,
        payment: PaymentTransaction,
        event_key: str,
        event_type: str,
        provider_transaction_id: str,
        payload_sha256: str,
    ) -> tuple[PaymentWebhookEvent, bool]:
        existing = self.repository.get_webhook_event(provider=PaymentProvider.KKIAPAY, event_key=event_key)
        if existing:
            return existing, existing.status == WebhookStatus.PROCESSED

        event = PaymentWebhookEvent(
            payment_id=payment.id,
            provider=PaymentProvider.KKIAPAY,
            event_key=event_key,
            event_type=event_type,
            provider_transaction_id=provider_transaction_id,
            payload_sha256=payload_sha256,
            status=WebhookStatus.RECEIVED,
        )
        self.repository.add_webhook_event(event)
        return event, False

    @staticmethod
    def mark_webhook_processed(event: PaymentWebhookEvent) -> None:
        event.status = WebhookStatus.PROCESSED
        event.error_code = None
        event.processed_at = datetime.now(timezone.utc)

    @staticmethod
    def mark_webhook_failed(event: PaymentWebhookEvent, *, error_code: str) -> None:
        event.status = WebhookStatus.FAILED
        event.error_code = error_code[:120]

    def _release_pending_order(self, order: Order, *, payment_status: str, note: str) -> None:
        if order.status != "pending_payment":
            return

        variant_ids = [item.variant_id for item in order.items]
        locked = {variant.id: variant for variant in self.order_repository.get_variants_for_update(variant_ids)}
        if len(locked) != len(set(variant_ids)):
            raise ApiException(
                status_code=409,
                code="ORDER_VARIANT_MISSING",
                message="Une variante de la commande n'est plus disponible.",
            )

        for item in order.items:
            variant = locked[item.variant_id]
            if variant.reserved_quantity < item.quantity:
                raise ApiException(
                    status_code=409,
                    code="ORDER_RESERVATION_INCONSISTENT",
                    message="La réservation de stock de la commande est incohérente.",
                )
            variant.reserved_quantity -= item.quantity

        previous = order.status
        order.status = "cancelled"
        order.payment_status = payment_status
        order.history.append(OrderStatusHistory(from_status=previous, to_status="cancelled", note=note))


    @staticmethod
    def _is_expired(payment: PaymentTransaction, *, now: datetime | None = None) -> bool:
        if not payment.expires_at:
            return False
        current = now or datetime.now(timezone.utc)
        expires_at = payment.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)
        return current >= expires_at

    @staticmethod
    def _assert_kkiapay_mobile_money(payment: PaymentTransaction) -> None:
        if payment.provider != PaymentProvider.KKIAPAY or payment.method != PaymentMethod.MOBILE_MONEY:
            raise ApiException(
                status_code=409,
                code="PAYMENT_PROVIDER_MISMATCH",
                message="Ce paiement n'est pas un paiement Mobile Money Kkiapay.",
            )

    @staticmethod
    def _assert_same_payment(
        transaction: PaymentTransaction,
        *,
        order: Order,
        method: str,
        provider: str,
        amount_xof: int,
    ) -> None:
        same_order = transaction.order_id in {None, order.id} or transaction.order is order
        if (
            not same_order
            or transaction.method != method
            or transaction.provider != provider
            or transaction.amount_xof != amount_xof
            or transaction.currency != order.currency
        ):
            raise ApiException(
                status_code=409,
                code="PAYMENT_IDEMPOTENCY_CONFLICT",
                message="Cette clé d'idempotence est déjà utilisée pour un autre paiement.",
            )
