from __future__ import annotations

import argparse
import sys
from uuid import uuid4

from app.core.config import get_settings
from app.models.orders import Order, OrderItem
from app.services.email import EmailService


def main() -> None:
    parser = argparse.ArgumentParser(description="Tester l'envoi d'e-mails transactionnels Myintimy.")
    parser.add_argument("--to", default="murielleodilone@gmail.com", help="Adresse e-mail destinataire")
    parser.add_argument(
        "--type",
        choices=["reset", "order", "admin", "generic"],
        default="reset",
        help="Type d'e-mail à envoyer (reset, order, admin, generic)",
    )
    args = parser.parse_args()

    settings = get_settings()
    email_service = EmailService(settings=settings)

    print("\n--- Configuration SMTP actuelle (.env) ---")
    print(f"Hôte SMTP          : {settings.smtp_host or '[NON CONFIGURÉ]'}")
    print(f"Port SMTP          : {settings.smtp_port}")
    print(f"Utilisateur SMTP   : {settings.smtp_user or '[NON RENSEIGNÉ]'}")
    print(f"Mot de passe SMTP  : {'*' * len(settings.smtp_password) if settings.smtp_password else '[NON RENSEIGNÉ]'}")
    print(f"STARTTLS activé    : {settings.smtp_use_tls}")
    print(f"SSL activé         : {settings.smtp_use_ssl}")
    print(f"Expéditeur (From)  : {settings.mail_from_name} <{settings.mail_from_email}>")
    print(f"Destinataire (To)  : {args.to}")
    print("------------------------------------------\n")

    if not settings.smtp_host:
        print("ATTENTION : Aucun serveur SMTP n'est encore configuré dans 'backend/.env'.")
        print("Pour envoyer un e-mail réel vers votre boîte Gmail, veuillez renseigner dans backend/.env :")
        print("  SMTP_HOST=smtp.gmail.com (ou votre hébergeur)")
        print("  SMTP_PORT=587")
        print("  SMTP_USER=votre-adresse@gmail.com")
        print("  SMTP_PASSWORD=votre-mot-de-passe-d-application")
        print("  MAIL_FROM_EMAIL=votre-adresse@gmail.com")
        print("\nTentative d'envoi simulé...")

    if args.type == "reset":
        print(f"Envoi d'un e-mail de réinitialisation de mot de passe à {args.to}...")
        success = email_service.send_password_reset(
            to_email=args.to,
            reset_token="test-token-demo-123456",
            customer_name="Murielle",
        )
    elif args.type == "order":
        print(f"Envoi d'un e-mail de confirmation de commande à {args.to}...")
        sample_order = Order(
            id=uuid4(),
            reference="MYI-TEST-001",
            customer_name="Murielle",
            customer_phone="+22901020304",
            customer_email=args.to,
            city="Cotonou",
            area="Haie Vive",
            address="Rue 123",
            neutral_packaging=True,
            subtotal_xof=45000,
            shipping_xof=1500,
            total_xof=46500,
            currency="XOF",
            status="confirmed",
            payment_method="cash_on_delivery",
            payment_status="cash_on_delivery",
        )
        sample_order.items = [
            OrderItem(
                id=uuid4(),
                order_id=sample_order.id,
                variant_id=uuid4(),
                product_name="Ensemble Lingerie Soie Délicate",
                product_slug="ensemble-lingerie-soie-delicate",
                sku="ENS-SOIE-ROUGE-M",
                color_name="Rouge Passion",
                color_slug="rouge-passion",
                size_code="M",
                quantity=1,
                unit_price_xof=45000,
                line_total_xof=45000,
            )
        ]
        success = email_service.send_order_confirmation(sample_order)
    elif args.type == "admin":
        print(f"Envoi d'une notification admin pour nouvelle commande à {settings.mail_admin_email}...")
        sample_order = Order(
            id=uuid4(),
            reference="MYI-TEST-ADMIN",
            customer_name="Murielle",
            customer_phone="+22901020304",
            customer_email=args.to,
            city="Cotonou",
            area="Haie Vive",
            address="Rue 123",
            neutral_packaging=True,
            subtotal_xof=45000,
            shipping_xof=1500,
            total_xof=46500,
            currency="XOF",
            status="confirmed",
            payment_method="cash_on_delivery",
            payment_status="cash_on_delivery",
        )
        sample_order.items = []
        success = email_service.send_admin_order_notification(sample_order)
    else:
        print(f"Envoi d'un e-mail générique de test à {args.to}...")
        success = email_service.send_email(
            to_email=args.to,
            subject="Test de connexion e-mail — Myintimy",
            text_content="Bonjour Murielle,\n\nCeci est un e-mail de test envoyé depuis le service transactionnel Myintimy.\nSi vous recevez ce message, votre configuration SMTP est parfaitement fonctionnelle !",
            html_content="<p>Bonjour Murielle,</p><p>Ceci est un e-mail de test envoyé depuis le service transactionnel <strong>Myintimy</strong>.<br>Si vous recevez ce message, votre configuration SMTP est parfaitement fonctionnelle !</p>",
        )

    if success:
        print(f"\n[SUCCÈS] L'e-mail a été envoyé avec succès à {args.to} !")
    else:
        print(f"\n[ÉCHEC / SIMULATION] L'e-mail n'a pas pu être transmis via SMTP.")
        if not settings.smtp_host:
            print("Raison : Aucun serveur SMTP n'est configuré (SMTP_HOST est vide).")


if __name__ == "__main__":
    main()

