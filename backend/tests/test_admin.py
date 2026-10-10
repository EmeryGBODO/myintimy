from __future__ import annotations

import base64

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin import AdminUser


PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def create_admin() -> None:
    with SessionLocal() as db:
        db.add(AdminUser(email="admin@myintimy.test", full_name="Admin Test", password_hash=hash_password("a-very-safe-password"), is_active=True, is_superuser=True))
        db.commit()


def auth_headers(client) -> dict[str, str]:
    create_admin()
    response = client.post("/api/v1/admin/auth/login", json={"email": "admin@myintimy.test", "password": "a-very-safe-password"})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_requires_authentication(client):
    response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ADMIN_AUTH_REQUIRED"


def test_admin_login_and_dashboard(client, seeded_db):
    headers = auth_headers(client)
    me = client.get("/api/v1/admin/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "admin@myintimy.test"

    dashboard = client.get("/api/v1/admin/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["products_total"] == 26
    assert dashboard.json()["variants_total"] == 214


def test_admin_category_and_product_crud(client, seeded_db):
    headers = auth_headers(client)
    category = client.post("/api/v1/admin/categories", headers=headers, json={"title": "Accessoires", "subtitle": "Compléments"})
    assert category.status_code == 201
    category_id = category.json()["id"]

    product = client.post("/api/v1/admin/products", headers=headers, json={
        "category_id": category_id,
        "name": "Pochette discrète",
        "type": "accessoire",
        "price_xof": 6500,
        "description": "Pochette de rangement.",
        "material": "Coton",
        "is_active": True,
    })
    assert product.status_code == 201
    product_id = product.json()["id"]

    updated = client.patch(f"/api/v1/admin/products/{product_id}", headers=headers, json={"price_xof": 7000, "is_new": True})
    assert updated.status_code == 200
    assert updated.json()["price_xof"] == 7000
    assert updated.json()["is_new"] is True

    deleted = client.delete(f"/api/v1/admin/products/{product_id}", headers=headers)
    assert deleted.status_code == 204
    category_deleted = client.delete(f"/api/v1/admin/categories/{category_id}", headers=headers)
    assert category_deleted.status_code == 204


def test_admin_variant_stock_and_image(client, seeded_db, tmp_path, monkeypatch):
    from app.services import media as media_module

    headers = auth_headers(client)
    products = client.get("/api/v1/admin/products", headers=headers).json()["items"]
    product_id = products[0]["id"]
    colors = client.get("/api/v1/admin/colors", headers=headers).json()
    sizes = client.get("/api/v1/admin/sizes", headers=headers).json()

    response = client.post(f"/api/v1/admin/products/{product_id}/variants", headers=headers, json={
        "color_id": colors[0]["id"],
        "size_id": sizes[0]["id"],
        "sku": "TEST-ADMIN-UNIQUE",
        "initial_stock": 3,
    })
    # The seed may already contain the same color/size pair, so use conflict as proof that dimensions are protected.
    if response.status_code == 409:
        product = client.get(f"/api/v1/admin/products/{product_id}", headers=headers).json()
        variant_id = product["variants"][0]["id"]
    else:
        assert response.status_code == 201
        variant_id = response.json()["id"]

    adjusted = client.post(f"/api/v1/admin/variants/{variant_id}/stock", headers=headers, json={"delta": 2, "reason": "Test admin"})
    assert adjusted.status_code == 200
    movements = client.get(f"/api/v1/admin/variants/{variant_id}/movements", headers=headers)
    assert movements.status_code == 200
    assert movements.json()[0]["movement_type"] == "admin_adjustment"

    monkeypatch.setattr(media_module.ProductImageService, "__init__", lambda self, db: (setattr(self, "db", db), setattr(self, "settings", type("S", (), {"max_product_image_bytes": 5*1024*1024})()), setattr(self, "media_root", tmp_path))[-1])
    image = client.post(
        f"/api/v1/admin/products/{product_id}/images",
        headers=headers,
        files={"file": ("test.png", PNG_1X1, "image/png")},
        data={"alt_text": "Image test"},
    )
    assert image.status_code == 201
    assert image.json()["url"].startswith("/media/products/")
