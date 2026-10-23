from __future__ import annotations

import pytest
from pydantic import ValidationError
from starlette.testclient import TestClient

from app.schemas.admin import AdminColorCreate
from app.schemas.shipping import DeliveryZoneCreateIn


def test_customer_register_validation_errors_in_french(client: TestClient) -> None:
    # Payload invalide : nom trop court, email erroné, mot de passe trop court, téléphone invalide
    res = client.post(
        "/api/v1/client/auth/register",
        json={
            "full_name": "A",
            "email": "not-an-email",
            "phone": "invalid-phone-abc",
            "password": "123",
        },
    )
    assert res.status_code == 422
    payload = res.json()
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert "invalides" in payload["error"]["message"].lower()

    details = payload["error"]["details"]
    assert isinstance(details, list)
    field_to_msg = {e["loc"][-1]: e["msg"] for e in details}

    assert "full_name" in field_to_msg
    assert "au moins 2 caractères" in field_to_msg["full_name"]

    assert "email" in field_to_msg
    assert "e-mail" in field_to_msg["email"].lower()

    assert "password" in field_to_msg
    assert "au moins 10 caractères" in field_to_msg["password"]

    assert "phone" in field_to_msg
    assert "téléphone" in field_to_msg["phone"].lower()


def test_order_validation_invalid_phone_and_quantity(client: TestClient) -> None:
    res = client.post(
        "/api/v1/orders",
        json={
            "customer_name": "Test Client",
            "customer_phone": "12",
            "customer_email": "bad-email",
            "city": "Cotonou",
            "area": "Haie Vive",
            "address": "Rue 123",
            "items": [
                {
                    "variant_id": "00000000-0000-0000-0000-000000000001",
                    "quantity": 0,
                }
            ],
        },
    )
    assert res.status_code == 422
    payload = res.json()
    field_to_msg = {e["loc"][-1]: e["msg"] for e in payload["error"]["details"]}

    assert "customer_phone" in field_to_msg
    assert "téléphone" in field_to_msg["customer_phone"].lower()

    assert "customer_email" in field_to_msg
    assert "e-mail" in field_to_msg["customer_email"].lower()

    assert "quantity" in field_to_msg
    assert "supérieure ou égale à 1" in field_to_msg["quantity"]


def test_shipping_negative_fee_rejected() -> None:
    with pytest.raises(ValidationError) as exc_info:
        DeliveryZoneCreateIn(name="Zone Test", fee_xof=-500)

    errors = exc_info.value.errors()
    assert any("fee_xof" in err["loc"] for err in errors)


def test_admin_color_hex_pattern_validation() -> None:
    with pytest.raises(ValidationError):
        AdminColorCreate(name="Rouge", hex_value="red")
