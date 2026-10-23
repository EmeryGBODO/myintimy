from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DeliveryZoneBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    fee_xof: int = Field(ge=0, description="Tarif standard de livraison en FCFA")
    free_shipping_threshold_xof: int | None = Field(
        default=None,
        ge=0,
        description="Montant minimum d'achats en FCFA pour bénéficier de la livraison gratuite (None si jamais offerte)",
    )
    is_active: bool = Field(default=True, description="Statut actif / inactif")
    display_order: int = Field(default=0, ge=0)


class DeliveryZoneCreateIn(DeliveryZoneBase):
    code: str | None = Field(default=None, max_length=120, description="Code slug unique (généré si omis)")


class DeliveryZoneUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    fee_xof: int | None = Field(default=None, ge=0)
    free_shipping_threshold_xof: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    display_order: int | None = Field(default=None, ge=0)


class DeliveryZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str
    fee_xof: int
    free_shipping_threshold_xof: int | None
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class ShippingQuoteIn(BaseModel):
    city: str = Field(min_length=1, max_length=120, description="Ville ou zone de livraison")
    subtotal_xof: int = Field(ge=0, description="Montant sous-total des articles en FCFA")


class ShippingQuoteOut(BaseModel):
    city: str
    zone_id: UUID
    zone_name: str
    fee_xof: int
    standard_fee_xof: int
    is_free: bool
    free_shipping_threshold_xof: int | None
    amount_left_for_free_shipping: int | None

