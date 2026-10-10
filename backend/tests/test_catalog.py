from app.db.session import SessionLocal
from app.models.catalog import Category, InventoryMovement, Product, ProductVariant
from app.seeds.catalog import seed_catalog


def test_seed_is_idempotent_and_creates_expected_catalog(seeded_db):
    with SessionLocal() as db:
        assert db.query(Category).count() == 4
        assert db.query(Product).count() == 26
        variant_count = db.query(ProductVariant).count()
        assert variant_count > 100
        assert db.query(InventoryMovement).count() == variant_count
        counts = seed_catalog(db)
        assert counts == {"categories": 0, "colors": 0, "sizes": 0, "products": 0, "variants": 0}
        assert db.query(ProductVariant).count() == variant_count
        assert db.query(InventoryMovement).count() == variant_count


def test_public_catalog_endpoints(client, seeded_db):
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    categories = response.json()
    assert [item["slug"] for item in categories] == ["lingerie", "vetements", "nuit", "couple"]

    response = client.get("/api/v1/products?category=lingerie&limit=100")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 8
    assert len(payload["items"]) == 8
    assert payload["items"][0]["public_id"] == "1"
    assert payload["items"][0]["price_xof"] == 38000
    assert payload["items"][0]["in_stock"] is True


def test_product_detail_variants_and_related(client, seeded_db):
    response = client.get("/api/v1/products/1")
    assert response.status_code == 200
    product = response.json()
    assert product["name"] == "Soutien-gorge Séraphine"
    assert [color["slug"] for color in product["colors"]] == ["noir", "rose", "prune"]
    assert [size["code"] for size in product["sizes"]] == ["XS", "S", "M", "L", "XL"]
    assert len(product["variants"]) == 15
    assert all(variant["available_quantity"] == 12 for variant in product["variants"])

    response = client.get("/api/v1/products/1/related?limit=4")
    assert response.status_code == 200
    related = response.json()
    assert len(related) == 4
    assert all(item["category"]["slug"] == "lingerie" for item in related)
    assert all(item["public_id"] != "1" for item in related)


def test_catalog_filters_and_errors(client, seeded_db):
    response = client.get("/api/v1/products?is_new=true&max_price=30000")
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    assert all(item["is_new"] and item["price_xof"] <= 30000 for item in items)

    response = client.get("/api/v1/products?q=velours")
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["items"]]
    assert "Porte-jarretelles Velours" in names


    response = client.get("/api/v1/products?category=lingerie&q=dentelle&color=noir&size=M")
    assert response.status_code == 200
    filtered = response.json()["items"]
    assert filtered
    assert all(item["category"]["slug"] == "lingerie" for item in filtered)
    assert all(any(color["slug"] == "noir" for color in item["colors"]) for item in filtered)
    assert all(any(size["code"] == "M" for size in item["sizes"]) for item in filtered)

    response = client.get("/api/v1/products/inexistant")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_stock_adjustment_is_traced_and_cannot_go_below_reserved(seeded_db):
    from app.core.exceptions import ApiException
    from app.models.catalog import InventoryMovement, ProductVariant
    from app.services.inventory import InventoryService

    with SessionLocal() as db:
        variant = db.query(ProductVariant).filter(ProductVariant.sku == "MYI-001-NOIR-M").one()
        service = InventoryService(db)
        updated = service.adjust_stock(variant.id, delta=-2, movement_type="manual_adjustment", reason="Test")
        assert updated.stock_quantity == 10
        movement = db.query(InventoryMovement).filter(InventoryMovement.variant_id == variant.id).order_by(InventoryMovement.created_at.desc()).first()
        assert movement.quantity_delta == -2
        assert movement.quantity_after == 10

        updated.reserved_quantity = 9
        db.commit()
        try:
            service.adjust_stock(updated.id, delta=-2, movement_type="manual_adjustment")
            assert False, "Une sortie sous le stock réservé devait être refusée"
        except ApiException as exc:
            assert exc.code == "INSUFFICIENT_STOCK"
