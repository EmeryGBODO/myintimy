from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Protocol

from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.models.orders import Order
from app.models.payments import PaymentTransaction
from app.repositories.payments import PaymentRepository


class PaymentProvider:
    INTERNAL = "internal"


class PaymentMethod:
    CASH_ON_DELIVERY = "cash_on_delivery"
    MOBILE_MONEY = "mobile_money"


class PaymentStatus:
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

    FINAL = {SUCCEEDED, FAILED, CANCELLED, REFUNDED}
    ALL = {PENDING, *FINAL}


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
    """Provider-independent payment orchestration.

    This service owns local payment transaction creation and idempotency rules.
    Provider-specific network calls are delegated to a PaymentGateway implementation.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = PaymentRepository(db)

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

    @staticmethod
    def _assert_same_payment(
        transaction: PaymentTransaction,
        *,
        order: Order,
        method: str,
        provider: str,
        amount_xof: int,
    ) -> None:
        # An idempotency key may only ever represent one logical payment.
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
