from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PaymentTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider: str
    method: str
    status: str
    amount_xof: int
    currency: str
    provider_transaction_id: str | None
    provider_reference: str | None
    checkout_url: str | None
    failure_code: str | None
    failure_message: str | None
    verification_attempts: int
    expires_at: datetime | None
    requires_review: bool
    review_reason: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class KkiapayConfigOut(BaseModel):
    enabled: bool
    public_key: str | None
    sandbox: bool
    country: str = "BJ"
    payment_method: str = "momo"
    session_minutes: int


class KkiapayVerifyIn(BaseModel):
    payment_id: UUID
    transaction_id: str = Field(min_length=3, max_length=200)


class KkiapayWebhookIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transaction_id: str = Field(alias="transactionId", min_length=3, max_length=200)
    is_payment_success: bool = Field(alias="isPaymentSucces")
    account: str | None = None
    failure_code: str | None = Field(default=None, alias="failureCode")
    failure_message: str | None = Field(default=None, alias="failureMessage")
    label: str | None = None
    method: str
    amount: int = Field(ge=0)
    fees: int | None = None
    partner_id: str | None = Field(default=None, alias="partnerId")
    performed_at: str | None = Field(default=None, alias="performedAt")
    event: str
