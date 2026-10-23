from __future__ import annotations

import logging
import smtplib
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.core.config import Settings
from app.models.orders import Order, OrderItem
from app.services.email import EmailService


@pytest.fixture
def email_settings():
    return Settings(
        smtp_host="smtp.mailtrap.io",
        smtp_port=587,
        smtp_user="test_user",
        smtp_password="test_password",
        smtp_use_tls=True,
        smtp_use_ssl=False,
        smtp_timeout=5,
        mail_from_email="no-reply@myintimy.com",
        mail_from_name="Myintimy",
        mail_admin_email="commandes@myintimy.com",
        frontend_url="http://localhost:5173",
    )


@pytest.fixture
def sample_order():
    order = Order(
        id=uuid4(),
        reference="MYI-261015-ABC",
        customer_name="Fatou Traoré",
        customer_phone="+22901020304",
        customer_email="fatou@example.com",
        city="Cotonou",
        area="Haie Vive",
        address="Rue 340, Immeuble Rose",
        neutral_packaging=True,
        subtotal_xof=35000,
        shipping_xof=1500,
        total_xof=36500,
        currency="XOF",
        status="confirmed",
        payment_method="cash_on_delivery",
        payment_status="cash_on_delivery",
    )
    item = OrderItem(
        id=uuid4(),
        order_id=order.id,
        variant_id=uuid4(),
        product_name="Ensemble Soie Rouge",
        product_slug="ensemble-soie-rouge",
        sku="ENS-ROUGE-M",
        color_name="Rouge Passion",
        color_slug="rouge-passion",
        size_code="M",
        quantity=2,
        unit_price_xof=17500,
        line_total_xof=35000,
    )
    order.items = [item]
    return order


# =============================================================================
# Tests unitaires du service d'envoi SMTP (succès & échec)
# =============================================================================

def test_send_email_success(email_settings):
    """Vérifie le bon déroulement d'un envoi SMTP standard avec TLS et authentification."""
    service = EmailService(settings=email_settings)

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        sent = service.send_email(
            to_email="client@example.com",
            subject="Bienvenue chez Myintimy",
            text_content="Bonjour, merci pour votre inscription.",
            html_content="<p>Bonjour, merci pour votre inscription.</p>",
        )

        assert sent is True
        mock_smtp_cls.assert_called_once_with(
            host="smtp.mailtrap.io",
            port=587,
            timeout=5,
        )
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test_user", "test_password")
        mock_server.send_message.assert_called_once()

        # Vérification du message généré
        msg = mock_server.send_message.call_args[0][0]
        assert msg["Subject"] == "Bienvenue chez Myintimy"
        assert msg["To"] == "client@example.com"
        assert "Myintimy" in msg["From"]
        assert "no-reply@myintimy.com" in msg["From"]


def test_send_email_ssl_success():
    """Vérifie le support SMTP avec SSL (port 465)."""
    ssl_settings = Settings(
        smtp_host="smtp.gmail.com",
        smtp_port=465,
        smtp_user="ssl_user",
        smtp_password="ssl_password",
        smtp_use_ssl=True,
    )
    service = EmailService(settings=ssl_settings)

    with patch("smtplib.SMTP_SSL") as mock_smtp_ssl:
        mock_server = MagicMock()
        mock_smtp_ssl.return_value.__enter__.return_value = mock_server

        sent = service.send_email(
            to_email="client@example.com",
            subject="Test SSL",
            text_content="Texte SSL",
        )

        assert sent is True
        mock_smtp_ssl.assert_called_once_with(host="smtp.gmail.com", port=465, timeout=10)
        mock_server.login.assert_called_once_with("ssl_user", "ssl_password")


def test_send_email_multi_recipients_envelope(email_settings):
    """Vérifie que send_email avec une liste de destinataires peuple bien msg['To'] et passe to_addrs à SMTP."""
    service = EmailService(settings=email_settings)

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        recipients = ["admin1@myintimy.com", "admin2@myintimy.com"]
        sent = service.send_email(
            to_email=recipients,
            subject="Alerte multi-admins",
            text_content="Alerte.",
        )

        assert sent is True
        mock_server.send_message.assert_called_once()
        msg = mock_server.send_message.call_args[0][0]
        call_kwargs = mock_server.send_message.call_args[1]

        assert msg["To"] == "admin1@myintimy.com, admin2@myintimy.com"
        assert call_kwargs["to_addrs"] == ["admin1@myintimy.com", "admin2@myintimy.com"]


def test_send_email_smtp_failure_is_logged_and_returns_false(email_settings, caplog):
    """Vérifie qu'une panne SMTP est proprement journalisée et ne fait pas planter l'application."""
    service = EmailService(settings=email_settings)

    with patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, b"Connection refused")):
        with caplog.at_level(logging.ERROR, logger="myintimy.email"):
            sent = service.send_email(
                to_email="destinataire@example.com",
                subject="Test échec",
                text_content="Ce message va échouer.",
            )

        assert sent is False
        assert any("Échec lors de l'envoi de l'e-mail à destinataire@example.com" in record.message for record in caplog.records)


def test_send_email_no_smtp_host_configured():
    """Si aucun hôte SMTP n'est renseigné, l'envoi est ignoré sans lever d'exception."""
    service = EmailService(settings=Settings(smtp_host=""))
    sent = service.send_email(
        to_email="destinataire@example.com",
        subject="Test sans SMTP",
        text_content="Texte",
    )
    assert sent is False


def test_send_email_invalid_recipient(email_settings):
    """Une adresse destinataire invalide ou vide retourne False sans appeler SMTP."""
    service = EmailService(settings=email_settings)
    with patch("smtplib.SMTP") as mock_smtp:
        assert service.send_email(to_email="", subject="Test", text_content="Texte") is False
        assert service.send_email(to_email="invalid-email", subject="Test", text_content="Texte") is False
        mock_smtp.assert_not_called()


# =============================================================================
# Tests des templates spécifiques
# =============================================================================

def test_password_reset_email(email_settings):
    """Vérifie le contenu et l'URL générée pour la réinitialisation de mot de passe."""
    service = EmailService(settings=email_settings)

    with patch.object(service, "send_email", return_value=True) as mock_send:
        sent = service.send_password_reset(
            to_email="client@example.com",
            reset_token="secret-token-xyz-123",
            customer_name="Amina",
        )

        assert sent is True
        mock_send.assert_called_once()
        kwargs = mock_send.call_args[1]
        assert kwargs["to_email"] == "client@example.com"
        assert "Réinitialisation" in kwargs["subject"]
        assert "Amina" in kwargs["text_content"]
        assert "/#/compte/reinitialiser?token=secret-token-xyz-123" in kwargs["text_content"]
        assert "/#/compte/reinitialiser?token=secret-token-xyz-123" in kwargs["html_content"]


def test_order_confirmation_email(email_settings, sample_order):
    """Vérifie l'exhaustivité du contenu de la confirmation de commande adressée au client."""
    service = EmailService(settings=email_settings)

    with patch.object(service, "send_email", return_value=True) as mock_send:
        sent = service.send_order_confirmation(sample_order)

        assert sent is True
        mock_send.assert_called_once()
        kwargs = mock_send.call_args[1]

        # 1. Destinataire et objet
        assert kwargs["to_email"] == "fatou@example.com"
        assert "MYI-261015-ABC" in kwargs["subject"]

        # 2. Référence et statut initial (Critères 1 & 5)
        assert "MYI-261015-ABC" in kwargs["text_content"]
        assert "Confirmée" in kwargs["text_content"]
        assert "Confirmée" in kwargs["html_content"]

        # 3. Articles, quantités et montants (Critère 2)
        assert "Ensemble Soie Rouge" in kwargs["text_content"]
        assert "x2" in kwargs["text_content"]
        assert "17,500 FCFA" in kwargs["text_content"]
        assert "35,000 FCFA" in kwargs["text_content"]

        # 4. Sous-total, frais de livraison et total TTC (Critère 3)
        assert "35,000 FCFA" in kwargs["text_content"]
        assert "1,500 FCFA" in kwargs["text_content"]
        assert "36,500 FCFA" in kwargs["text_content"]

        # 5. Mode de paiement et adresse de livraison (Critère 4)
        assert "Paiement à la livraison" in kwargs["text_content"]
        assert "Rue 340" in kwargs["text_content"]
        assert "Haie Vive" in kwargs["text_content"]
        assert "Cotonou" in kwargs["text_content"]
        assert "+22901020304" in kwargs["text_content"]
        assert "Emballage discret et neutre" in kwargs["text_content"]


def test_order_confirmation_email_skips_when_no_customer_email(email_settings, sample_order):
    """Si la commande invité n'a pas d'adresse e-mail, la confirmation client est ignorée."""
    sample_order.customer_email = None
    service = EmailService(settings=email_settings)

    with patch.object(service, "send_email") as mock_send:
        sent = service.send_order_confirmation(sample_order)
        assert sent is False
        mock_send.assert_not_called()


def test_admin_order_notification_email(email_settings, sample_order):
    """Vérifie la notification administrateur : destinataire, référence, client, total, paiement, articles et lien back-office."""
    service = EmailService(settings=email_settings)

    with patch.object(service, "send_email", return_value=True) as mock_send:
        sent = service.send_admin_order_notification(sample_order)

        assert sent is True
        mock_send.assert_called_once()
        kwargs = mock_send.call_args[1]

        # 1. Destinataires (Critères 1 & 4)
        assert kwargs["to_email"] == ["commandes@myintimy.com"]

        # 2. Objet
        assert "Nouvelle commande" in kwargs["subject"]
        assert "MYI-261015-ABC" in kwargs["subject"]
        assert "36,500 FCFA" in kwargs["subject"]
        assert "Fatou Traoré" in kwargs["subject"]

        # 3. Référence, client, montant total et paiement (Critère 2)
        assert "MYI-261015-ABC" in kwargs["text_content"]
        assert "Fatou Traoré" in kwargs["text_content"]
        assert "+22901020304" in kwargs["text_content"]
        assert "fatou@example.com" in kwargs["text_content"]
        assert "Rue 340, Immeuble Rose, Haie Vive, Cotonou" in kwargs["text_content"]
        assert "36,500 FCFA" in kwargs["text_content"]
        assert "Paiement à la livraison" in kwargs["text_content"]

        # 4. Articles commandés
        assert "Ensemble Soie Rouge" in kwargs["text_content"]
        assert "x2" in kwargs["text_content"]
        assert "35,000 FCFA" in kwargs["text_content"]

        # 5. Lien direct vers le détail dans l'administration (Critère 3)
        expected_admin_url = f"http://localhost:5173/#/admin/orders/{sample_order.id}"
        assert expected_admin_url in kwargs["text_content"]
        assert expected_admin_url in kwargs["html_content"]

        # 6. Absence totale de secrets ou tokens sensibles (Critère 6)
        full_email = kwargs["subject"] + kwargs["text_content"] + kwargs["html_content"]
        assert "password" not in full_email.lower()
        assert "token" not in full_email.lower()
        assert "jwt" not in full_email.lower()


def test_admin_order_notification_multiple_recipients(sample_order):
    """Critère 4 : Plusieurs administrateurs peuvent être configurés via des séparateurs multiples (, ; espaces)."""
    multi_settings = Settings(
        smtp_host="smtp.mailtrap.io",
        mail_admin_email="admin1@myintimy.com, admin2@myintimy.com; direction@myintimy.com ops@myintimy.com",
    )
    service = EmailService(settings=multi_settings)

    with patch.object(service, "send_email", return_value=True) as mock_send:
        sent = service.send_admin_order_notification(sample_order)

        assert sent is True
        mock_send.assert_called_once()
        kwargs = mock_send.call_args[1]
        assert kwargs["to_email"] == [
            "admin1@myintimy.com",
            "admin2@myintimy.com",
            "direction@myintimy.com",
            "ops@myintimy.com",
        ]


def test_admin_order_notification_skips_when_no_recipients(sample_order):
    """Critère 1 : Si aucun administrateur n'est configuré, l'envoi est ignoré sans erreur."""
    no_admin_settings = Settings(
        smtp_host="smtp.mailtrap.io",
        mail_admin_email="",
    )
    service = EmailService(settings=no_admin_settings)

    with patch.object(service, "send_email") as mock_send:
        sent = service.send_admin_order_notification(sample_order)
        assert sent is False
        mock_send.assert_not_called()


# =============================================================================
# Test d'intégration : Tolérance aux pannes e-mail (Critère d'acceptation 5)
# =============================================================================

def test_order_creation_persists_even_if_smtp_fails(client, seeded_db, caplog, monkeypatch):
    """Critère 5 : Une panne d'envoi e-mail NE DOIT PAS empêcher ni annuler la création de la commande."""
    from app.core.config import get_settings

    monkeypatch.setenv("SMTP_HOST", "failing.smtp.test")
    monkeypatch.setenv("MAIL_ADMIN_EMAIL", "admin@myintimy.com")
    get_settings.cache_clear()

    product = client.get("/api/v1/products/1").json()
    variant = product["variants"][0]

    payload = {
        "customer_name": "Koffi Mensah",
        "customer_phone": "+22997001122",
        "customer_email": "koffi@example.com",
        "city": "Cotonou",
        "area": "Gbégamey",
        "address": "Carré 123",
        "neutral_packaging": True,
        "payment_method": "cash_on_delivery",
        "items": [{"variant_id": variant["id"], "quantity": 1}],
    }

    try:
        # Simulation d'un crash complet du serveur SMTP
        with patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, b"Mail server offline")):
            with caplog.at_level(logging.ERROR):
                response = client.post("/api/v1/orders", json=payload)

        # 1. La commande est quand même créée avec succès (HTTP 201)
        assert response.status_code == 201
        data = response.json()
        assert data["reference"].startswith("MYI-")
        assert data["status"] == "confirmed"
        assert data["customer_email"] == "koffi@example.com"

        # 2. L'erreur SMTP a été journalisée proprement
        assert any(record.levelno == logging.ERROR for record in caplog.records)
        assert any("mail server offline" in record.message.lower() or "échec" in record.message.lower() for record in caplog.records)

        # 3. La commande est bien persistée et le stock a bien été réservé
        variant_after = client.get("/api/v1/products/1").json()["variants"][0]
        assert variant_after["reserved_quantity"] == variant["reserved_quantity"] + 1
    finally:
        get_settings.cache_clear()


def test_password_reset_persists_even_if_smtp_fails(client, caplog, monkeypatch):
    """Vérifie que la demande de réinitialisation de mot de passe réussit même si SMTP est en panne."""
    from app.core.config import get_settings

    # 1. Inscription d'un client
    reg = client.post("/api/v1/client/auth/register", json={
        "full_name": "Amina Test",
        "email": "amina@example.com",
        "phone": "+22901020304",
        "password": "Password2026!",
    })
    assert reg.status_code == 201

    monkeypatch.setenv("SMTP_HOST", "failing.smtp.test")
    get_settings.cache_clear()

    try:
        with patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, b"Mail server offline")):
            with caplog.at_level(logging.ERROR):
                response = client.post("/api/v1/client/auth/password-reset/request", json={"email": "amina@example.com"})

        # La requête aboutit (200 OK)
        assert response.status_code == 200
        # En mode test, le token est renvoyé dans development_token
        token = response.json()["development_token"]
        assert token

        # L'erreur SMTP a été journalisée proprement
        assert any(record.levelno == logging.ERROR for record in caplog.records)

        # Le token généré reste parfaitement utilisable pour réinitialiser le mot de passe
        confirm = client.post("/api/v1/client/auth/password-reset/confirm", json={"token": token, "password": "NewPassword2026!"})
        assert confirm.status_code == 204

        # Connexion avec le nouveau mot de passe
        login = client.post("/api/v1/client/auth/login", json={"email": "amina@example.com", "password": "NewPassword2026!"})
        assert login.status_code == 200
    finally:
        get_settings.cache_clear()

