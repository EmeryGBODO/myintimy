from __future__ import annotations

import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

PHONE_REGEX = re.compile(r"^\+?[0-9\s.\-()]{5,30}$")
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class OrderItemCreateIn(BaseModel):
    variant_id: UUID
    quantity: int = Field(ge=1, le=20)


class OrderCreateIn(BaseModel):
    customer_name: str = Field(min_length=2, max_length=180)
    customer_phone: str = Field(min_length=5, max_length=60)
    customer_email: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=120)
    area: str = Field(min_length=1, max_length=160)
    address: str = Field(min_length=2, max_length=1000)
    neutral_packaging: bool = True
    payment_method: Literal["cash_on_delivery"] = "cash_on_delivery"
    items: list[OrderItemCreateIn] = Field(min_length=1, max_length=50)

    @field_validator("customer_phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        val = v.strip()
        if not val or not PHONE_REGEX.match(val):
            raise ValueError("Format de numéro de téléphone invalide.")
        digits = re.sub(r"\D", "", val)
        if len(digits) < 5 or len(digits) > 20:
            raise ValueError("Le numéro de téléphone doit contenir entre 5 et 20 chiffres.")
        return val

    @field_validator("customer_email")
    @classmethod
    def check_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        val = v.strip()
        if not val:
            return None
        if not EMAIL_REGEX.match(val):
            raise ValueError("Format d'adresse e-mail invalide.")
        return val.lower()


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    variant_id: UUID
    product_name: str
    product_slug: str
    sku: str
    color_name: str
    color_slug: str
    size_code: str | None
    quantity: int
    unit_price_xof: int
    line_total_xof: int


class OrderStatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_status: str | None
    to_status: str
    note: str | None
    created_at: datetime


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    status: str
    payment_method: str
    payment_status: str
    customer_name: str
    customer_phone: str
    customer_email: str | None
    city: str
    area: str
    address: str
    neutral_packaging: bool
    subtotal_xof: int
    shipping_xof: int
    total_xof: int
    currency: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]
    history: list[OrderStatusHistoryOut]


class AdminOrderStatusUpdateIn(BaseModel):
    status: str = Field(min_length=1, max_length=32)
    note: str | None = Field(default=None, max_length=500)
