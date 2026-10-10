from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.models.catalog import InventoryMovement
from app.repositories.inventory import InventoryRepository


class InventoryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = InventoryRepository(db)

    def adjust_stock(
        self,
        identifier: str | UUID,
        *,
        delta: int,
        movement_type: str,
        reason: str | None = None,
        reference: str | None = None,
    ):
        if delta == 0:
            raise ApiException(status_code=422, code="INVALID_STOCK_DELTA", message="Le mouvement de stock ne peut pas être nul.")

        variant = self.repository.get_variant_for_update(identifier)
        if not variant:
            raise ApiException(status_code=404, code="VARIANT_NOT_FOUND", message="La variante demandée n'existe pas.")

        new_quantity = variant.stock_quantity + delta
        if new_quantity < variant.reserved_quantity:
            raise ApiException(
                status_code=409,
                code="INSUFFICIENT_STOCK",
                message="Le stock ne peut pas devenir inférieur à la quantité réservée.",
                details={"stock": variant.stock_quantity, "reserved": variant.reserved_quantity, "delta": delta},
            )

        variant.stock_quantity = new_quantity
        self.repository.add_movement(
            InventoryMovement(
                variant_id=variant.id,
                movement_type=movement_type,
                quantity_delta=delta,
                quantity_after=new_quantity,
                reason=reason,
                reference=reference,
            )
        )
        self.db.commit()
        self.db.refresh(variant)
        return variant
