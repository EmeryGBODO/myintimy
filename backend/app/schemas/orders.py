from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
