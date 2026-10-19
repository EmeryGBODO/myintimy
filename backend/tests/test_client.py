from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from app.db.session import SessionLocal
from app.models.client import CustomerPasswordResetToken
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


def test_password_reset_email_dispatch_and_security(client):
    """Vérifie que la demande valide déclenche l'envoi d'e-mail avec le token sans exposer le mot de passe, et que l'API ne révèle pas l'existence d'adresses inexistantes."""
    register(client, "alice_security@example.com")

    with patch("app.services.client.EmailService.send_password_reset") as mock_send:
        # 1. Demande valide pour compte existant
        resp = client.post("/api/v1/client/auth/password-reset/request", json={"email": "alice_security@example.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Si un compte correspond à cette adresse, un lien de réinitialisation sera envoyé."
        token = data["development_token"]
        assert token

        # Vérification que send_password_reset a été appelé avec les bonnes infos
        mock_send.assert_called_once()
        kwargs = mock_send.call_args[1]
        assert kwargs["to_email"] == "alice_security@example.com"
        assert kwargs["reset_token"] == token
        assert kwargs["customer_name"] == "Alice Test"
        assert "password" not in kwargs

        mock_send.reset_mock()

        # 2. Demande pour une adresse inexistante : ne révèle rien (Critère d'acceptation 5)
        resp_nonexistent = client.post("/api/v1/client/auth/password-reset/request", json={"email": "inconnu_totale@example.com"})
        assert resp_nonexistent.status_code == 200
        assert resp_nonexistent.json()["message"] == "Si un compte correspond à cette adresse, un lien de réinitialisation sera envoyé."
        # Aucun e-mail n'a été envoyé
        mock_send.assert_not_called()


def test_password_reset_rejects_expired_and_invalid_tokens(client):
    """Vérifie le rejet des tokens invalides, trop courts, expirés et mots de passe trop courts."""
    import hashlib

    register(client, "bob_security@example.com")
    resp = client.post("/api/v1/client/auth/password-reset/request", json={"email": "bob_security@example.com"})
    token = resp.json()["development_token"]

    # 1. Token invalide (n'existe pas)
    invalid_resp = client.post("/api/v1/client/auth/password-reset/confirm", json={
        "token": "token-totalement-invalide-qui-n-existe-pas-12345",
        "password": "NouveauMotDePasse2026!",
    })
    assert invalid_resp.status_code == 400
    assert invalid_resp.json()["error"]["code"] == "INVALID_RESET_TOKEN"

    # 2. Token trop court pour validation Pydantic (< 20 caractères)
    short_token_resp = client.post("/api/v1/client/auth/password-reset/confirm", json={
        "token": "trop-court",
        "password": "NouveauMotDePasse2026!",
    })
    assert short_token_resp.status_code == 422

    # 3. Mot de passe trop court (< 10 caractères)
    short_pw_resp = client.post("/api/v1/client/auth/password-reset/confirm", json={
        "token": token,
        "password": "court",
    })
    assert short_pw_resp.status_code == 422

    # 4. Token expiré artificiellement en base
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with SessionLocal() as db:
        record = db.query(CustomerPasswordResetToken).filter_by(token_hash=token_hash).one()
        record.expires_at = datetime.now(UTC) - timedelta(hours=1)
        db.commit()

    expired_resp = client.post("/api/v1/client/auth/password-reset/confirm", json={
        "token": token,
        "password": "NouveauMotDePasse2026!",
    })
    assert expired_resp.status_code == 400
    assert expired_resp.json()["error"]["code"] == "EXPIRED_RESET_TOKEN"


def test_password_reset_invalidates_previous_pending_tokens(client):
    """Vérifie qu'une réinitialisation réussie invalide tous les autres tokens en attente pour le client."""
    register(client, "claire_security@example.com")

    # Première demande
    r1 = client.post("/api/v1/client/auth/password-reset/request", json={"email": "claire_security@example.com"})
    token1 = r1.json()["development_token"]

    # Deuxième demande
    r2 = client.post("/api/v1/client/auth/password-reset/request", json={"email": "claire_security@example.com"})
    token2 = r2.json()["development_token"]
    assert token1 != token2

    # On réinitialise avec le second token
    confirm = client.post("/api/v1/client/auth/password-reset/confirm", json={
        "token": token2,
        "password": "NouveauMotDePasse2026!",
    })
    assert confirm.status_code == 204

    # Le premier token doit maintenant être refusé
    confirm_old = client.post("/api/v1/client/auth/password-reset/confirm", json={
        "token": token1,
        "password": "AutreMotDePasse2026!",
    })
    assert confirm_old.status_code == 400
    assert confirm_old.json()["error"]["code"] == "INVALID_RESET_TOKEN"

