from __future__ import annotations

import re
import unicodedata
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.shipping import DeliveryZone


def slugify_zone(value: str) -> str:
    """Normalise un nom de ville / zone sous forme de slug standard."""
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")


class DeliveryZoneRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[DeliveryZone]:
        """Retourne toutes les zones de livraison actives ordonnées par display_order puis nom."""
        stmt = (
            select(DeliveryZone)
            .where(DeliveryZone.is_active.is_(True))
            .order_by(DeliveryZone.display_order.asc(), DeliveryZone.name.asc())
        )
        return list(self.db.scalars(stmt))

    def list_all(self) -> list[DeliveryZone]:
        """Retourne toutes les zones de livraison (actives et inactives)."""
        stmt = select(DeliveryZone).order_by(DeliveryZone.display_order.asc(), DeliveryZone.name.asc())
        return list(self.db.scalars(stmt))

    def get_by_id(self, zone_id: UUID) -> DeliveryZone | None:
        return self.db.get(DeliveryZone, zone_id)

    def get_by_name_or_code(self, identifier: str) -> DeliveryZone | None:
        """Retrouve une zone par son nom (insensible à la casse) ou son code slug."""
        if not identifier or not identifier.strip():
            return None
        raw = identifier.strip()
        slug = slugify_zone(raw)

        stmt = select(DeliveryZone).where(
            or_(
                func.lower(DeliveryZone.name) == raw.casefold(),
                DeliveryZone.code == slug,
                func.lower(DeliveryZone.code) == raw.casefold(),
            )
        )
        return self.db.scalar(stmt)

    def create(self, zone: DeliveryZone) -> DeliveryZone:
        self.db.add(zone)
        self.db.flush()
        return zone

    def delete(self, zone: DeliveryZone) -> None:
        self.db.delete(zone)
        self.db.flush()

