from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.shipping import DeliveryZone

DEFAULT_DELIVERY_ZONES = [
    {
        "name": "Cotonou",
        "code": "cotonou",
        "fee_xof": 1500,
        "free_shipping_threshold_xof": 50000,
        "is_active": True,
        "display_order": 1,
    },
    {
        "name": "Abomey-Calavi",
        "code": "abomey-calavi",
        "fee_xof": 3000,
        "free_shipping_threshold_xof": 50000,
        "is_active": True,
        "display_order": 2,
    },
    {
        "name": "Porto-Novo",
        "code": "porto-novo",
        "fee_xof": 3000,
        "free_shipping_threshold_xof": 50000,
        "is_active": True,
        "display_order": 3,
    },
    {
        "name": "Ouidah",
        "code": "ouidah",
        "fee_xof": 3000,
        "free_shipping_threshold_xof": 50000,
        "is_active": True,
        "display_order": 4,
    },
    {
        "name": "Bohicon",
        "code": "bohicon",
        "fee_xof": 3000,
        "free_shipping_threshold_xof": 50000,
        "is_active": True,
        "display_order": 5,
    },
    {
        "name": "Parakou",
        "code": "parakou",
        "fee_xof": 4000,
        "free_shipping_threshold_xof": 50000,
        "is_active": True,
        "display_order": 6,
    },
    {
        "name": "Autre ville",
        "code": "autre-ville",
        "fee_xof": 3500,
        "free_shipping_threshold_xof": 50000,
        "is_active": True,
        "display_order": 7,
    },
]


def seed_delivery_zones(db: Session) -> int:
    """Peuple ou synchronise les zones de livraison initiales en base de données.

    Retourne le nombre de zones créées.
    """
    created_count = 0
    for item in DEFAULT_DELIVERY_ZONES:
        zone = db.scalar(select(DeliveryZone).where(DeliveryZone.code == item["code"]))
        if zone is None:
            zone = DeliveryZone(
                name=item["name"],
                code=item["code"],
                fee_xof=item["fee_xof"],
                free_shipping_threshold_xof=item["free_shipping_threshold_xof"],
                is_active=item["is_active"],
                display_order=item["display_order"],
            )
            db.add(zone)
            db.flush()
            created_count += 1
        else:
            zone.name = item["name"]
            zone.fee_xof = item["fee_xof"]
            zone.free_shipping_threshold_xof = item["free_shipping_threshold_xof"]
            zone.is_active = item["is_active"]
            zone.display_order = item["display_order"]

    db.flush()
    return created_count

