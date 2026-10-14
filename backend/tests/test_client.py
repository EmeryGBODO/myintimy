from app.db.session import SessionLocal
from app.models.orders import Order


def register(client, email="alice@example.com"):
    response = client.post("/api/v1/client/auth/register", json={
        "full_name": "Alice Test",
        "email": email,
        "phone": "+22901020304",
        "password": "MotDePasse2026!",
    })
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_login_profile_and_addresses(client):
    token = register(client)
    profile = client.get("/api/v1/client/me", headers=auth(token))
    assert profile.status_code == 200
    assert profile.json()["email"] == "alice@example.com"

    updated = client.patch("/api/v1/client/me", headers=auth(token), json={"full_name": "Alice B.", "phone": "+229999"})
    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Alice B."

    address = client.post("/api/v1/client/me/addresses", headers=auth(token), json={
        "label": "Maison", "recipient_name": "Alice B.", "phone": "+229999", "city": "Cotonou",
        "area": "Cadjehoun", "address": "Rue de test", "is_default": False,
    })
    assert address.status_code == 201
    assert address.json()["is_default"] is True
    assert len(client.get("/api/v1/client/me/addresses", headers=auth(token)).json()) == 1

    login = client.post("/api/v1/client/auth/login", json={"email": "alice@example.com", "password": "MotDePasse2026!"})
    assert login.status_code == 200


def test_password_reset_token_is_single_use_in_test(client):
    register(client)
    request = client.post("/api/v1/client/auth/password-reset/request", json={"email": "alice@example.com"})
    assert request.status_code == 200
    token = request.json()["development_token"]
    assert token

    reset = client.post("/api/v1/client/auth/password-reset/confirm", json={"token": token, "password": "NouveauMot2026!"})
    assert reset.status_code == 204
    replay = client.post("/api/v1/client/auth/password-reset/confirm", json={"token": token, "password": "EncoreUnMot2026!"})
    assert replay.status_code == 400
    login = client.post("/api/v1/client/auth/login", json={"email": "alice@example.com", "password": "NouveauMot2026!"})
    assert login.status_code == 200


def test_favorites_sync(client, seeded_db):
    token = register(client)
    added = client.post("/api/v1/client/me/favorites/1", headers=auth(token))
    assert added.status_code == 201
    assert added.json()["public_id"] == "1"
    favorites = client.get("/api/v1/client/me/favorites", headers=auth(token))
    assert [item["public_id"] for item in favorites.json()] == ["1"]
    assert client.delete("/api/v1/client/me/favorites/1", headers=auth(token)).status_code == 204
    assert client.get("/api/v1/client/me/favorites", headers=auth(token)).json() == []


def test_authenticated_order_is_attached_and_visible_only_to_owner(client, seeded_db):
    alice = register(client, "alice@example.com")
    bob = register(client, "bob@example.com")
    product = client.get("/api/v1/products/1").json()
    variant_id = product["variants"][0]["id"]
    response = client.post("/api/v1/orders", headers=auth(alice), json={
        "customer_name": "Alice Test", "customer_phone": "+22901", "customer_email": "alice@example.com",
        "city": "Cotonou", "area": "Centre", "address": "Rue 1", "neutral_packaging": True,
        "payment_method": "cash_on_delivery", "items": [{"variant_id": variant_id, "quantity": 1}],
    })
    assert response.status_code == 201, response.text
    reference = response.json()["reference"]

    mine = client.get("/api/v1/client/me/orders", headers=auth(alice))
    assert mine.status_code == 200 and mine.json()[0]["reference"] == reference
    assert client.get(f"/api/v1/client/me/orders/{reference}", headers=auth(bob)).status_code == 404

    with SessionLocal() as db:
        order = db.query(Order).filter(Order.reference == reference).one()
        assert order.customer_id is not None
