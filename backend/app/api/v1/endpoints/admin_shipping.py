from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.schemas.shipping import DeliveryZoneCreateIn, DeliveryZoneOut, DeliveryZoneUpdateIn
from app.services.shipping import ShippingService

router = APIRouter(
    prefix="/admin/shipping/zones",
    tags=["admin-shipping"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=list[DeliveryZoneOut])
def list_admin_delivery_zones(db: Session = Depends(get_db)):
    """Liste toutes les zones de livraison (actives et inactives) pour l'administration."""
    return ShippingService(db).list_all_zones()


@router.post("", response_model=DeliveryZoneOut, status_code=201)
def create_delivery_zone(payload: DeliveryZoneCreateIn, db: Session = Depends(get_db)):
    """Crée une nouvelle zone de livraison avec son tarif et son seuil de gratuité."""
    return ShippingService(db).create_zone(payload)


@router.patch("/{zone_id}", response_model=DeliveryZoneOut)
def update_delivery_zone(
    zone_id: UUID,
    payload: DeliveryZoneUpdateIn,
    db: Session = Depends(get_db),
):
    """Modifie une zone de livraison (tarif, seuil de gratuité, activation/désactivation)."""
    return ShippingService(db).update_zone(zone_id, payload)

