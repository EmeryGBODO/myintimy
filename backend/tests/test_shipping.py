from __future__ import annotations

import pytest
from app.core.exceptions import ApiException
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin import AdminUser
from app.models.orders import Order
from app.models.shipping import DeliveryZone
from app.seeds.shipping import seed_delivery_zones
from app.services.shipping import ShippingService


def _admin_headers(client) -> dict[str, str]:
    with SessionLocal() as db:
        admin = db.query(AdminUser).filter(AdminUser.email == "shipping_admin@myintimy.test").first()
        if not admin:
            db.add(
                AdminUser(
                    email="shipping_admin@myintimy.test",
                    full_name="Shipping Admin",
                    password_hash=hash_password("admin-shipping-pass"),
                    is_active=True,
                    is_superuser=True,
                )
            )
            db.commit()
    response = client.post(
        "/api/v1/admin/auth/login",
        json={"email": "shipping_admin@myintimy.test", "password": "admin-shipping-pass"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


# =============================================================================
# Tests Unitaires du ShippingService (Critères 1, 2, 3, 5, 6)
# =============================================================================

def test_seed_delivery_zones_persists_in_database():
    """Critère 1 : Les zones de livraison sont persistées en base avec leurs attributs requis."""
    with SessionLocal() as db:
        count = seed_delivery_zones(db)
        assert count > 0

        service = ShippingService(db)
        zones = service.list_active_zones()
        assert len(zones) >= 7

        zone_names = {z.name for z in zones}
        assert "Cotonou" in zone_names
        assert "Abomey-Calavi" in zone_names
        assert "Parakou" in zone_names
        assert "Porto-Novo" in zone_names

        cotonou = service.get_zone("Cotonou")
        # Critères 2 & 6 : nom, tarif entier en FCFA, statut actif, seuil
        assert cotonou.name == "Cotonou"
        assert cotonou.fee_xof == 1500
        assert isinstance(cotonou.fee_xof, int)
        assert cotonou.is_active is True
        assert cotonou.free_shipping_threshold_xof == 50000


def test_shipping_fee_multiple_zones_and_free_threshold():
    """Critères 2, 3 & 7 : Calcul des frais pour plusieurs zones et application du seuil de gratuité."""
    with SessionLocal() as db:
        seed_delivery_zones(db)
        service = ShippingService(db)

        # 1. Sous le seuil de gratuité : chaque zone applique son tarif propre
        assert service.calculate_fee(city="Cotonou", subtotal_xof=20000) == 1500
        assert service.calculate_fee(city="Parakou", subtotal_xof=20000) == 4000
        assert service.calculate_fee(city="Abomey-Calavi", subtotal_xof=20000) == 3000

        # 2. Au seuil ou au-dessus du seuil (50 000 FCFA) : gratuité appliquée (0 FCFA)
        assert service.calculate_fee(city="Cotonou", subtotal_xof=50000) == 0
        assert service.calculate_fee(city="Parakou", subtotal_xof=50000) == 0
        assert service.calculate_fee(city="Parakou", subtotal_xof=75000) == 0


def test_shipping_zone_without_free_shipping_threshold():
    """Critère 3 : Une zone sans seuil de gratuité (None) conserve toujours ses frais."""
    with SessionLocal() as db:
        seed_delivery_zones(db)
        # Création d'une zone express / internationale sans gratuité
        zone = DeliveryZone(
            name="Zone Express Sans Gratuité",
            code="zone-express",
            fee_xof=6000,
            free_shipping_threshold_xof=None,
            is_active=True,
        )
        db.add(zone)
        db.commit()

        service = ShippingService(db)
        # Même pour un montant élevé, les frais restent appliqués
        assert service.calculate_fee(city="Zone Express Sans Gratuité", subtotal_xof=100000) == 6000


def test_shipping_service_unknown_zone_raises_explicit_exception():
    """Critère 5 : Une zone inconnue est gérée explicitement via une exception dédiée."""
    with SessionLocal() as db:
        seed_delivery_zones(db)
        service = ShippingService(db)

        with pytest.raises(ApiException) as exc_info:
            service.calculate_fee(city="Atlantis", subtotal_xof=25000)

        assert exc_info.value.status_code == 422
        assert exc_info.value.code == "UNKNOWN_DELIVERY_ZONE"
        assert "Atlantis" in exc_info.value.message

        # Test ville vide
        with pytest.raises(ApiException) as exc_empty:
            service.calculate_fee(city="", subtotal_xof=25000)
        assert exc_empty.value.code == "UNKNOWN_DELIVERY_ZONE"


def test_shipping_service_inactive_zone_raises_explicit_exception():
    """Critère 2 & 5 : Une zone désactivée est rejetée explicitement."""
    with SessionLocal() as db:
        seed_delivery_zones(db)
        # On désactive la zone Parakou
        zone = db.query(DeliveryZone).filter(DeliveryZone.name == "Parakou").one()
        zone.is_active = False
        db.commit()

        service = ShippingService(db)
        with pytest.raises(ApiException) as exc_info:
            service.calculate_fee(city="Parakou", subtotal_xof=25000)

        assert exc_info.value.status_code == 422
        assert exc_info.value.code == "INACTIVE_DELIVERY_ZONE"
        assert "Parakou" in exc_info.value.message


def test_shipping_service_normalization_case_and_accents():
    """Vérifie la tolérance à la casse et aux variantes d'écriture."""
    with SessionLocal() as db:
        seed_delivery_zones(db)
        service = ShippingService(db)

        # Minuscules, majuscules, espaces superflus
        assert service.calculate_fee(city="cotonou", subtotal_xof=20000) == 1500
        assert service.calculate_fee(city="COTONOU", subtotal_xof=20000) == 1500
        assert service.calculate_fee(city=" Cotonou ", subtotal_xof=20000) == 1500

        # Noms avec tirets ou espaces
        assert service.calculate_fee(city="abomey-calavi", subtotal_xof=20000) == 3000
        assert service.calculate_fee(city="Abomey Calavi", subtotal_xof=20000) == 3000
        assert service.calculate_fee(city="porto-novo", subtotal_xof=20000) == 3000


# =============================================================================
# Tests des Endpoints Publics de Devis & Zones (Critères 4 & 5)
# =============================================================================

def test_api_list_delivery_zones(client, seeded_db):
    """L'endpoint public GET /api/v1/shipping/zones renvoie les zones actives en base."""
    response = client.get("/api/v1/shipping/zones")
    assert response.status_code == 200
    zones = response.json()
    assert len(zones) >= 7

    names = [z["name"] for z in zones]
    assert "Cotonou" in names
    cotonou = next(z for z in zones if z["name"] == "Cotonou")
    assert cotonou["fee_xof"] == 1500
    assert cotonou["free_shipping_threshold_xof"] == 50000
    assert cotonou["is_active"] is True


def test_api_quote_shipping_endpoint(client, seeded_db):
    """L'endpoint POST /api/v1/shipping/quote calcule le tarif et le montant restant pour la gratuité."""
    # 1. Sous-total inférieur au seuil
    res1 = client.post("/api/v1/shipping/quote", json={"city": "Cotonou", "subtotal_xof": 35000})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["fee_xof"] == 1500
    assert data1["is_free"] is False
    assert data1["amount_left_for_free_shipping"] == 15000  # 50 000 - 35 000

    # 2. Sous-total atteignant le seuil
    res2 = client.post("/api/v1/shipping/quote", json={"city": "Cotonou", "subtotal_xof": 50000})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["fee_xof"] == 0
    assert data2["is_free"] is True
    assert data2["amount_left_for_free_shipping"] is None

    # 3. Zone inconnue : réponse 422 explicite
    res3 = client.post("/api/v1/shipping/quote", json={"city": "InconnueVille", "subtotal_xof": 10000})
    assert res3.status_code == 422
    assert res3.json()["error"]["code"] == "UNKNOWN_DELIVERY_ZONE"


# =============================================================================
# Tests d'Intégration : Création de commande & Source de Vérité Backend (Critères 4, 5, 6, 7)
# =============================================================================

def test_order_creation_calculates_shipping_and_handles_zones(client, seeded_db):
    """Critère 4 : Le backend est la seule source de vérité pour le calcul des frais et totaux."""
    product = client.get("/api/v1/products/1").json()
    variant = product["variants"][0]

    # Commande 1 : Cotonou, 1 article à 38 000 FCFA (< 50 000) -> 1 500 FCFA de livraison
    payload_cotonou = {
        "customer_name": "Test Cotonou",
        "customer_phone": "+22901020304",
        "city": "Cotonou",
        "area": "Haie Vive",
        "address": "Rue 10",
        "neutral_packaging": True,
        "payment_method": "cash_on_delivery",
        "items": [{"variant_id": variant["id"], "quantity": 1}],
    }
    res_cotonou = client.post("/api/v1/orders", json=payload_cotonou)
    assert res_cotonou.status_code == 201
    order_cotonou = res_cotonou.json()
    assert order_cotonou["subtotal_xof"] == 38000
    assert order_cotonou["shipping_xof"] == 1500
    assert order_cotonou["total_xof"] == 39500

    # Commande 2 : Parakou, 1 article à 38 000 FCFA -> 4 000 FCFA de livraison
    payload_parakou = {**payload_cotonou, "customer_name": "Test Parakou", "city": "Parakou"}
    res_parakou = client.post("/api/v1/orders", json=payload_parakou)
    assert res_parakou.status_code == 201
    order_parakou = res_parakou.json()
    assert order_parakou["subtotal_xof"] == 38000
    assert order_parakou["shipping_xof"] == 4000
    assert order_parakou["total_xof"] == 42000

    # Commande 3 : Cotonou, 2 articles (76 000 FCFA >= 50 000) -> livraison offerte (0 FCFA)
    payload_free = {
        **payload_cotonou,
        "customer_name": "Test Gratuit",
        "items": [{"variant_id": variant["id"], "quantity": 2}],
    }
    res_free = client.post("/api/v1/orders", json=payload_free)
    assert res_free.status_code == 201
    order_free = res_free.json()
    assert order_free["subtotal_xof"] == 76000
    assert order_free["shipping_xof"] == 0
    assert order_free["total_xof"] == 76000

    # Commande 4 : Ville inconnue -> rejet explicite 422 sans création de commande
    payload_unknown = {**payload_cotonou, "city": "VilleNonDesservie"}
    res_unknown = client.post("/api/v1/orders", json=payload_unknown)
    assert res_unknown.status_code == 422
    assert res_unknown.json()["error"]["code"] == "UNKNOWN_DELIVERY_ZONE"

    with SessionLocal() as db:
        order = db.query(Order).filter(Order.reference == order_cotonou["reference"]).one()
        assert order.delivery_zone_id is not None
        assert order.delivery_zone.name == "Cotonou"


# =============================================================================
# Tests d'Administration des Zones de Livraison
# =============================================================================

def test_admin_delivery_zones_crud(client, seeded_db):
    """L'administration peut lister, créer et mettre à jour les zones de livraison."""
    headers = _admin_headers(client)

    # 1. Lister les zones admin
    list_res = client.get("/api/v1/admin/shipping/zones", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 7

    # 2. Créer une nouvelle zone
    new_zone_payload = {
        "name": "Grand-Popo",
        "fee_xof": 3500,
        "free_shipping_threshold_xof": 60000,
        "is_active": True,
        "display_order": 10,
    }
    create_res = client.post("/api/v1/admin/shipping/zones", headers=headers, json=new_zone_payload)
    assert create_res.status_code == 201
    created_zone = create_res.json()
    assert created_zone["name"] == "Grand-Popo"
    assert created_zone["code"] == "grand-popo"
    assert created_zone["fee_xof"] == 3500

    # 3. Mettre à jour la zone (modifier le tarif et la désactiver)
    patch_res = client.patch(
        f"/api/v1/admin/shipping/zones/{created_zone['id']}",
        headers=headers,
        json={"fee_xof": 4000, "is_active": False},
    )
    assert patch_res.status_code == 200
    updated_zone = patch_res.json()
    assert updated_zone["fee_xof"] == 4000
    assert updated_zone["is_active"] is False

    # 4. Vérifier que la zone désactivée n'apparaît plus dans l'API publique
    public_res = client.get("/api/v1/shipping/zones")
    public_names = [z["name"] for z in public_res.json()]
    assert "Grand-Popo" not in public_names
