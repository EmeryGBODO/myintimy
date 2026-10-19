from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.shipping import DeliveryZoneOut, ShippingQuoteIn, ShippingQuoteOut
from app.services.shipping import ShippingService

router = APIRouter(prefix="/shipping", tags=["shipping"])


@router.get("/zones", response_model=list[DeliveryZoneOut])
def list_delivery_zones(db: Session = Depends(get_db)):
    """Retourne la liste des zones de livraison actives avec leurs tarifs et seuils de gratuité."""
    return ShippingService(db).list_active_zones()


@router.post("/quote", response_model=ShippingQuoteOut)
def quote_shipping_post(payload: ShippingQuoteIn, db: Session = Depends(get_db)):
    """Calcule les frais de livraison exacts et le montant restant pour la gratuité."""
    return ShippingService(db).calculate_quote(city=payload.city, subtotal_xof=payload.subtotal_xof)


@router.get("/quote", response_model=ShippingQuoteOut)
def quote_shipping_get(
    city: str = Query(..., min_length=1, max_length=120),
    subtotal_xof: int = Query(..., ge=0),
    db: Session = Depends(get_db),
):
    """Calcule les frais de livraison via requête GET pour faciliter l'intégration frontend."""
    return ShippingService(db).calculate_quote(city=city, subtotal_xof=subtotal_xof)

