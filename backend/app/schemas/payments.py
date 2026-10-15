from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
