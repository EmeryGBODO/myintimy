from __future__ import annotations

from uuid import UUID

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin import AdminUser
from app.models.catalog import InventoryMovement, ProductVariant
from app.models.orders import Order


def _variant(client):
    product = client.get("/api/v1/products/1").json()
    return product["variants"][0]


def _payload(variant_id: str, *, quantity: int = 1, city: str = "Cotonou") -> dict:
    return {
        "customer_name": "Awa Test",
        "customer_phone": "+22901020304",
        "customer_email": "awa@example.com",
        "city": city,
        "area": "Cadjehoun",
        "address": "Rue de test, maison 10",
        "neutral_packaging": True,
        "payment_method": "cash_on_delivery",
        "items": [{"variant_id": variant_id, "quantity": quantity}],
    }


def _admin_headers(client) -> dict[str, str]:
    with SessionLocal() as db:
        db.add(
            AdminUser(
                email="orders@myintimy.test",
                full_name="Orders Admin",
                password_hash=hash_password("a-very-safe-password"),
                is_active=True,
                is_superuser=True,
            )
        )
        db.commit()
    response = client.post(
        "/api/v1/admin/auth/login",
        json={"email": "orders@myintimy.test", "password": "a-very-safe-password"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_create_order_recalculates_total_and_reserves_stock(client, seeded_db):
    variant = _variant(client)
    response = client.post("/api/v1/orders", json=_payload(variant["id"]))

    assert response.status_code == 201
    order = response.json()
    assert order["reference"].startswith("MYI-")
    assert order["status"] == "confirmed"
    assert order["payment_method"] == "cash_on_delivery"
    assert order["subtotal_xof"] == 38000
    assert order["shipping_xof"] == 1500
    assert order["total_xof"] == 39500
    assert order["items"][0]["unit_price_xof"] == 38000

    with SessionLocal() as db:
        db_variant = db.get(ProductVariant, UUID(variant["id"]))
        assert db_variant.reserved_quantity == 1
        assert db.query(Order).count() == 1


def test_order_rejects_unavailable_payment_and_insufficient_stock(client, seeded_db):
    variant = _variant(client)
    payload = _payload(variant["id"], quantity=13)
    response = client.post("/api/v1/orders", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INSUFFICIENT_STOCK"

    payload = _payload(variant["id"])
    payload["payment_method"] = "card"
    response = client.post("/api/v1/orders", json=payload)
    assert response.status_code == 422


def test_admin_order_lifecycle_ships_stock_once(client, seeded_db):
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_payload(variant["id"]))
    order_id = created.json()["id"]
    reference = created.json()["reference"]
    headers = _admin_headers(client)

    listing = client.get("/api/v1/admin/orders", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["total"] == 1

    preparing = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        headers=headers,
        json={"status": "preparing", "note": "Préparation"},
    )
    assert preparing.status_code == 200

    shipped = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        headers=headers,
        json={"status": "shipped", "note": "Remise au livreur"},
    )
    assert shipped.status_code == 200
    assert shipped.json()["status"] == "shipped"

    with SessionLocal() as db:
        db_variant = db.get(ProductVariant, UUID(variant["id"]))
        assert db_variant.stock_quantity == 11
        assert db_variant.reserved_quantity == 0
        movement = (
            db.query(InventoryMovement)
            .filter(InventoryMovement.reference == reference, InventoryMovement.movement_type == "order_shipment")
            .one()
        )
        assert movement.quantity_delta == -1
        assert movement.quantity_after == 11

    duplicate = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        headers=headers,
        json={"status": "shipped"},
    )
    assert duplicate.status_code == 200
    with SessionLocal() as db:
        assert db.get(ProductVariant, UUID(variant["id"])).stock_quantity == 11


def test_cancelling_order_releases_reservation(client, seeded_db):
    variant = _variant(client)
    created = client.post("/api/v1/orders", json=_payload(variant["id"], quantity=2))
    order_id = created.json()["id"]
    headers = _admin_headers(client)

    cancelled = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        headers=headers,
        json={"status": "cancelled", "note": "Client indisponible"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    with SessionLocal() as db:
        db_variant = db.get(ProductVariant, UUID(variant["id"]))
        assert db_variant.stock_quantity == 12
        assert db_variant.reserved_quantity == 0
