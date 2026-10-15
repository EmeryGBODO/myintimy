from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.models.catalog import InventoryMovement, ProductVariant
from app.models.client import CustomerUser
from app.models.orders import Order, OrderItem, OrderStatusHistory
from app.repositories.orders import OrderRepository
from app.schemas.orders import OrderCreateIn
from app.services.kkiapay import KkiapayGateway
from app.services.payments import PaymentMethod, PaymentService
from app.services.shipping import ShippingService


class OrderStatus:
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

    ALL = {PENDING_PAYMENT, CONFIRMED, PREPARING, SHIPPED, DELIVERED, CANCELLED}


ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING_PAYMENT: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


class OrderService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = OrderRepository(db)

    def _reference(self) -> str:
        date_part = datetime.now(timezone.utc).strftime("%y%m%d")
        for _ in range(8):
            candidate = f"MYI-{date_part}-{secrets.token_hex(3).upper()}"
            if not self.repository.reference_exists(candidate):
                return candidate
        raise ApiException(status_code=503, code="ORDER_REFERENCE_UNAVAILABLE", message="Impossible de générer une référence de commande.")

    def create(self, data: OrderCreateIn, *, customer: CustomerUser | None = None) -> Order:
        if data.payment_method not in {PaymentMethod.CASH_ON_DELIVERY, PaymentMethod.MOBILE_MONEY}:
            raise ApiException(
                status_code=422,
                code="PAYMENT_METHOD_UNAVAILABLE",
                message="Ce moyen de paiement n'est pas disponible.",
            )
        if data.payment_method == PaymentMethod.MOBILE_MONEY and not KkiapayGateway().is_configured():
            raise ApiException(
                status_code=422,
                code="PAYMENT_METHOD_UNAVAILABLE",
                message="Le paiement Mobile Money n'est pas encore configuré.",
            )

        quantities: dict[UUID, int] = {}
        for item in data.items:
            quantities[item.variant_id] = quantities.get(item.variant_id, 0) + item.quantity

        variants = self.repository.get_variants_for_update(quantities.keys())
        by_id = {variant.id: variant for variant in variants}
        if len(by_id) != len(quantities):
            raise ApiException(status_code=409, code="VARIANT_UNAVAILABLE", message="Un article du panier n'est plus disponible.")

        subtotal = 0
        order_items: list[OrderItem] = []

        for variant_id, quantity in quantities.items():
            variant = by_id[variant_id]
            product = variant.product
            if not product.is_active:
                raise ApiException(status_code=409, code="PRODUCT_UNAVAILABLE", message=f"{product.name} n'est plus disponible.")
            if variant.available_quantity < quantity:
                raise ApiException(
                    status_code=409,
                    code="INSUFFICIENT_STOCK",
                    message=f"Stock insuffisant pour {product.name}.",
                    details={
                        "variant_id": str(variant.id),
                        "sku": variant.sku,
                        "requested": quantity,
                        "available": variant.available_quantity,
                    },
                )

            unit_price = variant.price_xof if variant.price_xof is not None else product.price_xof
            line_total = unit_price * quantity
            subtotal += line_total
            order_items.append(
                OrderItem(
                    variant_id=variant.id,
                    product_name=product.name,
                    product_slug=product.slug,
                    sku=variant.sku,
                    color_name=variant.color.name,
                    color_slug=variant.color.slug,
                    size_code=variant.size.code if variant.size else None,
                    quantity=quantity,
                    unit_price_xof=unit_price,
                    line_total_xof=line_total,
                )
            )
            variant.reserved_quantity += quantity

        shipping = ShippingService.calculate_fee(city=data.city, subtotal_xof=subtotal)
        is_mobile_money = data.payment_method == PaymentMethod.MOBILE_MONEY
        initial_status = OrderStatus.PENDING_PAYMENT if is_mobile_money else OrderStatus.CONFIRMED
        initial_payment_status = "pending" if is_mobile_money else "cash_on_delivery"
        order = Order(
            reference=self._reference(),
            customer_id=customer.id if customer else None,
            status=initial_status,
            payment_method=data.payment_method,
            payment_status=initial_payment_status,
            customer_name=data.customer_name.strip(),
            customer_phone=data.customer_phone.strip(),
            customer_email=(data.customer_email.strip().lower() if data.customer_email else None),
            city=data.city.strip(),
            area=data.area.strip(),
            address=data.address.strip(),
            neutral_packaging=data.neutral_packaging,
            subtotal_xof=subtotal,
            shipping_xof=shipping,
            total_xof=subtotal + shipping,
            currency="XOF",
            items=order_items,
        )
        if is_mobile_money:
            order.history.append(
                OrderStatusHistory(
                    from_status=None,
                    to_status=OrderStatus.PENDING_PAYMENT,
                    note="Commande créée - attente de confirmation Mobile Money",
                )
            )
            PaymentService(self.db).register_mobile_money(order)
        else:
            order.history.append(
                OrderStatusHistory(
                    from_status=None,
                    to_status=OrderStatus.CONFIRMED,
                    note="Commande créée - paiement à la livraison",
                )
            )
            PaymentService(self.db).register_cash_on_delivery(order)
        self.db.add(order)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return self.get(order.id)

    def get(self, order_id: UUID) -> Order:
        order = self.repository.get_by_id(order_id)
        if not order:
            raise ApiException(status_code=404, code="ORDER_NOT_FOUND", message="La commande demandée n'existe pas.")
        return order

    def get_by_reference(self, reference: str) -> Order:
        order = self.repository.get_by_reference(reference.strip().upper())
        if not order:
            raise ApiException(status_code=404, code="ORDER_NOT_FOUND", message="La commande demandée n'existe pas.")
        return order

    def list_admin(self, *, q: str | None = None, status: str | None = None, limit: int = 100, offset: int = 0) -> list[Order]:
        if status and status not in OrderStatus.ALL:
            raise ApiException(status_code=422, code="INVALID_ORDER_STATUS", message="Statut de commande invalide.")
        return self.repository.list_orders(q=q, status=status, limit=limit, offset=offset)

    def transition(self, order_id: UUID, *, status: str, note: str | None = None) -> Order:
        if status not in OrderStatus.ALL:
            raise ApiException(status_code=422, code="INVALID_ORDER_STATUS", message="Statut de commande invalide.")

        order = self.repository.get_by_id(order_id, for_update=True)
        if not order:
            raise ApiException(status_code=404, code="ORDER_NOT_FOUND", message="La commande demandée n'existe pas.")
        current = order.status
        if status == current:
            return order
        if status not in ALLOWED_TRANSITIONS.get(current, set()):
            raise ApiException(
                status_code=409,
                code="INVALID_ORDER_TRANSITION",
                message=f"La commande ne peut pas passer de {current} à {status}.",
            )

        if status in {OrderStatus.CANCELLED, OrderStatus.SHIPPED}:
            variant_ids = [item.variant_id for item in order.items]
            locked = {variant.id: variant for variant in self.repository.get_variants_for_update(variant_ids)}
            if len(locked) != len(set(variant_ids)):
                raise ApiException(status_code=409, code="ORDER_VARIANT_MISSING", message="Une variante de la commande n'est plus disponible.")

            for item in order.items:
                variant = locked[item.variant_id]
                if variant.reserved_quantity < item.quantity:
                    raise ApiException(status_code=409, code="ORDER_RESERVATION_INCONSISTENT", message="La réservation de stock de la commande est incohérente.")
                variant.reserved_quantity -= item.quantity
                if status == OrderStatus.SHIPPED:
                    if variant.stock_quantity < item.quantity:
                        raise ApiException(status_code=409, code="INSUFFICIENT_STOCK", message="Le stock physique est insuffisant pour expédier la commande.")
                    variant.stock_quantity -= item.quantity
                    self.db.add(
                        InventoryMovement(
                            variant_id=variant.id,
                            movement_type="order_shipment",
                            quantity_delta=-item.quantity,
                            quantity_after=variant.stock_quantity,
                            reason=f"Expédition commande {order.reference}",
                            reference=order.reference,
                        )
                    )

        order.status = status
        order.history.append(OrderStatusHistory(from_status=current, to_status=status, note=note.strip() if note else None))
        self.db.commit()
        return self.get(order.id)
