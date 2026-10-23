from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.orders import OrderOut

PHONE_REGEX = re.compile(r"^\+?[0-9\s.\-()]{5,30}$")


def validate_phone(value: str | None) -> str | None:
    if value is None:
        return None
    val = value.strip()
    if not val:
        return None
    if not PHONE_REGEX.match(val):
        raise ValueError("Format de numéro de téléphone invalide.")
    digits = re.sub(r"\D", "", val)
    if len(digits) < 5 or len(digits) > 20:
        raise ValueError("Le numéro de téléphone doit contenir entre 5 et 20 chiffres.")
    return val


class CustomerRegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=180)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=60)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str | None) -> str | None:
        return validate_phone(v)


class CustomerLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class CustomerTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class CustomerProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    full_name: str
    phone: str | None
    is_active: bool
    created_at: datetime


class CustomerProfileUpdateIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=180)
    phone: str | None = Field(default=None, max_length=60)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str | None) -> str | None:
        return validate_phone(v)


class PasswordResetRequestIn(BaseModel):
    email: EmailStr


class PasswordResetRequestOut(BaseModel):
    message: str
    development_token: str | None = None


class PasswordResetConfirmIn(BaseModel):
    token: str = Field(min_length=20, max_length=255)
    password: str = Field(min_length=10, max_length=128)


class CustomerAddressIn(BaseModel):
    label: str = Field(default="Adresse", min_length=1, max_length=80)
    recipient_name: str = Field(min_length=2, max_length=180)
    phone: str = Field(min_length=5, max_length=60)
    city: str = Field(min_length=1, max_length=120)
    area: str = Field(min_length=1, max_length=160)
    address: str = Field(min_length=2, max_length=1000)
    is_default: bool = False

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        res = validate_phone(v)
        if not res:
            raise ValueError("Le numéro de téléphone est obligatoire.")
        return res


class CustomerAddressOut(CustomerAddressIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime


class CustomerFavoriteOut(BaseModel):
    product_id: UUID
    public_id: str
    slug: str


class CustomerOrdersOut(BaseModel):
    items: list[OrderOut]
