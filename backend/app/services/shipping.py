from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.db.session import SessionLocal
from app.models.shipping import DeliveryZone
from app.repositories.shipping import DeliveryZoneRepository, slugify_zone
from app.schemas.shipping import DeliveryZoneCreateIn, DeliveryZoneUpdateIn, ShippingQuoteOut

logger = logging.getLogger("myintimy.shipping")


class ShippingService:
    """Service métier de tarification de livraison basé sur la configuration persistée en base."""

    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        self.repository = DeliveryZoneRepository(db) if db is not None else None

    def _ensure_repository(self) -> DeliveryZoneRepository:
        if self.repository is None:
            if self.db is None:
                self.db = SessionLocal()
            self.repository = DeliveryZoneRepository(self.db)
        return self.repository

    def list_active_zones(self) -> list[DeliveryZone]:
        repo = self._ensure_repository()
        return repo.list_active()

    def list_all_zones(self) -> list[DeliveryZone]:
        repo = self._ensure_repository()
        return repo.list_all()

    def get_zone(self, city: str, *, active_only: bool = True) -> DeliveryZone:
        """Retrouve la zone de livraison associée à une ville/zone donnée.

        Lève une ApiException explicite si la zone est inconnue ou inactive (Critère 5).
        """
        raw_city = (city or "").strip()
        if not raw_city:
            raise ApiException(
                status_code=422,
                code="UNKNOWN_DELIVERY_ZONE",
                message="La ville ou zone de livraison est requise.",
                details={"city": city},
            )

        repo = self._ensure_repository()
        zone = repo.get_by_name_or_code(raw_city)

        if zone is None:
            logger.warning("Tentative d'utilisation d'une zone de livraison inconnue: '%s'", raw_city)
            raise ApiException(
                status_code=422,
                code="UNKNOWN_DELIVERY_ZONE",
                message=f"La zone de livraison '{raw_city}' est inconnue ou n'est pas desservie.",
                details={"city": raw_city},
            )

        if active_only and not zone.is_active:
            logger.warning("Tentative d'utilisation d'une zone de livraison désactivée: '%s' (%s)", zone.name, zone.id)
            raise ApiException(
                status_code=422,
                code="INACTIVE_DELIVERY_ZONE",
                message=f"La zone de livraison '{zone.name}' est actuellement désactivée.",
                details={"city": raw_city, "zone_id": str(zone.id)},
            )

        return zone

    def calculate_fee(self, *, city: str, subtotal_xof: int) -> int:
        """Détermine les frais de livraison en FCFA à partir de la zone et du sous-total.

        - Vérifie la validité de la zone en base.
        - Applique la gratuité si le sous-total atteint ou dépasse le seuil configuré.
        """
        zone = self.get_zone(city, active_only=True)

        if (
            zone.free_shipping_threshold_xof is not None
            and subtotal_xof >= zone.free_shipping_threshold_xof
        ):
            return 0

        return zone.fee_xof

    def calculate_quote(self, *, city: str, subtotal_xof: int) -> ShippingQuoteOut:
        """Génère un devis complet de livraison pour le client."""
        zone = self.get_zone(city, active_only=True)
        is_free = (
            zone.free_shipping_threshold_xof is not None
            and subtotal_xof >= zone.free_shipping_threshold_xof
        )
        fee = 0 if is_free else zone.fee_xof
        amount_left = (
            max(0, zone.free_shipping_threshold_xof - subtotal_xof)
            if zone.free_shipping_threshold_xof is not None and not is_free
            else None
        )

        return ShippingQuoteOut(
            city=city.strip(),
            zone_id=zone.id,
            zone_name=zone.name,
            fee_xof=fee,
            standard_fee_xof=zone.fee_xof,
            is_free=is_free,
            free_shipping_threshold_xof=zone.free_shipping_threshold_xof,
            amount_left_for_free_shipping=amount_left,
        )

    def create_zone(self, data: DeliveryZoneCreateIn) -> DeliveryZone:
        repo = self._ensure_repository()
        code = slugify_zone(data.code or data.name)
        existing = repo.get_by_name_or_code(data.name) or repo.get_by_name_or_code(code)
        if existing:
            raise ApiException(
                status_code=409,
                code="DELIVERY_ZONE_EXISTS",
                message=f"Une zone de livraison avec le nom '{data.name}' ou le code '{code}' existe déjà.",
            )

        zone = DeliveryZone(
            name=data.name.strip(),
            code=code,
            fee_xof=data.fee_xof,
            free_shipping_threshold_xof=data.free_shipping_threshold_xof,
            is_active=data.is_active,
            display_order=data.display_order,
        )
        repo.create(zone)
        self.db.commit()
        return zone

    def update_zone(self, zone_id: UUID, data: DeliveryZoneUpdateIn) -> DeliveryZone:
        repo = self._ensure_repository()
        zone = repo.get_by_id(zone_id)
        if not zone:
            raise ApiException(
                status_code=404,
                code="DELIVERY_ZONE_NOT_FOUND",
                message="La zone de livraison demandée n'existe pas.",
            )

        if data.name is not None and data.name.strip() != zone.name:
            new_name = data.name.strip()
            existing = repo.get_by_name_or_code(new_name)
            if existing and existing.id != zone.id:
                raise ApiException(
                    status_code=409,
                    code="DELIVERY_ZONE_EXISTS",
                    message=f"Une zone de livraison portant le nom '{new_name}' existe déjà.",
                )
            zone.name = new_name
            zone.code = slugify_zone(new_name)

        if data.fee_xof is not None:
            zone.fee_xof = data.fee_xof
        if data.free_shipping_threshold_xof is not None:
            zone.free_shipping_threshold_xof = data.free_shipping_threshold_xof
        if data.is_active is not None:
            zone.is_active = data.is_active
        if data.display_order is not None:
            zone.display_order = data.display_order

        self.db.commit()
        return zone
