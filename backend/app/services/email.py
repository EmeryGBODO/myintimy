from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from typing import TYPE_CHECKING

from app.core.config import Settings, get_settings

if TYPE_CHECKING:
    from app.models.orders import Order

logger = logging.getLogger("myintimy.email")

ORDER_STATUS_LABELS: dict[str, str] = {
    "pending_payment": "En attente de paiement",
    "confirmed": "Confirmée",
    "preparing": "En cours de préparation",
    "shipped": "Expédiée",
    "delivered": "Livrée",
    "cancelled": "Annulée",
}

PAYMENT_METHOD_LABELS: dict[str, str] = {
    "cash_on_delivery": "Paiement à la livraison",
}


class EmailService:
    """Service centralisé d'envoi d'e-mails transactionnels pour Myintimy."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _build_smtp_client(self) -> smtplib.SMTP | smtplib.SMTP_SSL:
        """Instancie le client SMTP selon les paramètres d'environnement."""
        if self.settings.smtp_use_ssl:
            return smtplib.SMTP_SSL(
                host=self.settings.smtp_host,
                port=self.settings.smtp_port,
                timeout=self.settings.smtp_timeout,
            )
        return smtplib.SMTP(
            host=self.settings.smtp_host,
            port=self.settings.smtp_port,
            timeout=self.settings.smtp_timeout,
        )

    def send_email(
        self,
        *,
        to_email: str | list[str],
        subject: str,
        text_content: str,
        html_content: str | None = None,
    ) -> bool:
        """Envoie un e-mail via SMTP avec gestion des erreurs et journalisation.

        Supporte un destinataire unique ou une liste de destinataires.
        Retourne True si l'envoi a réussi, False sinon. Ne lève jamais d'exception non gérée.
        """
        if isinstance(to_email, list):
            recipients = [e.strip() for e in to_email if e and "@" in e.strip()]
        else:
            import re
            recipients = [e.strip() for e in re.split(r"[,;\s]+", to_email or "") if e and "@" in e.strip()]

        if not recipients:
            logger.warning(
                "Destinataire(s) e-mail invalide(s) ou manquant(s): '%s'. E-mail non envoyé.",
                to_email,
                extra={"to": to_email, "subject": subject},
            )
            return False

        if not self.settings.smtp_host:
            logger.info(
                "SMTP_HOST non configuré. Envoi simulé / ignoré pour %s (sujet: '%s').",
                recipients,
                subject,
                extra={"to": recipients, "subject": subject},
            )
            return False

        try:
            msg = EmailMessage()
            msg["Subject"] = subject.strip()
            msg["From"] = formataddr((self.settings.mail_from_name, self.settings.mail_from_email))
            msg["To"] = ", ".join(recipients)
            msg.set_content(text_content.strip(), charset="utf-8")

            if html_content:
                msg.add_alternative(html_content.strip(), subtype="html", charset="utf-8")

            with self._build_smtp_client() as server:
                if not self.settings.smtp_use_ssl and self.settings.smtp_use_tls:
                    server.starttls()

                if self.settings.smtp_user:
                    server.login(self.settings.smtp_user, self.settings.smtp_password)

                server.send_message(msg, to_addrs=recipients)

            logger.info(
                "E-mail envoyé avec succès à %s.",
                ", ".join(recipients),
                extra={"to": recipients, "subject": subject},
            )
            return True

        except Exception as exc:
            logger.exception(
                "Échec lors de l'envoi de l'e-mail à %s (sujet: %s): %s",
                ", ".join(recipients),
                subject,
                str(exc),
                extra={"to": recipients, "subject": subject},
            )
            return False

    # -------------------------------------------------------------------------
    # Modèles d'e-mails transactionnels
    # -------------------------------------------------------------------------

    def send_password_reset(
        self,
        *,
        to_email: str,
        reset_token: str,
        customer_name: str | None = None,
    ) -> bool:
        """Envoie l'e-mail de réinitialisation de mot de passe."""
        frontend_url = self.settings.frontend_url.rstrip("/")
        reset_url = f"{frontend_url}/#/compte/reinitialiser?token={reset_token}"
        expires_minutes = self.settings.customer_password_reset_minutes
        greeting_name = customer_name.strip() if customer_name and customer_name.strip() else "cher(e) client(e)"

        subject = "Réinitialisation de votre mot de passe — Myintimy"

        text_content = f"""Bonjour {greeting_name},

Vous avez demandé la réinitialisation de votre mot de passe sur Myintimy.

Veuillez cliquer sur le lien ci-dessous pour définir un nouveau mot de passe :
{reset_url}

Ce lien est valable pendant {expires_minutes} minutes et ne peut être utilisé qu'une seule fois.

Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.

L'équipe Myintimy
{frontend_url}
"""

        html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#FAF7F5;font-family:'Jost',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#16111A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #F2EAEC;">
    <tr>
      <td style="padding:28px 32px;background-color:#5B2A4E;color:#FAF7F5;text-align:center;">
        <h1 style="margin:0;font-family:'Cormorant Garamond',serif;font-size:28px;letter-spacing:1px;font-weight:600;">Myintimy</h1>
        <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">Votre boutique intime & élégante</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 16px 0;font-family:'Cormorant Garamond',serif;font-size:22px;color:#5B2A4E;">Réinitialisation de votre mot de passe</h2>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">Bonjour {greeting_name},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px 0;">
          Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Myintimy.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="{reset_url}" style="display:inline-block;background-color:#5B2A4E;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.5px;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="font-size:13px;line-height:1.5;color:#6E6268;margin:24px 0 8px 0;">
          Ce lien est sécurisé et valable pendant <strong>{expires_minutes} minutes</strong>.
        </p>
        <p style="font-size:12px;line-height:1.5;color:#6E6268;margin:0 0 24px 0;word-break:break-all;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
          <a href="{reset_url}" style="color:#5B2A4E;">{reset_url}</a>
        </p>
        <hr style="border:none;border-top:1px solid #F2EAEC;margin:24px 0;">
        <p style="font-size:12px;line-height:1.5;color:#94868B;margin:0;">
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail. Votre mot de passe actuel reste inchangé.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background-color:#FAF7F5;text-align:center;font-size:12px;color:#94868B;">
        © Myintimy — Tous droits réservés.
      </td>
    </tr>
  </table>
</body>
</html>
"""

        return self.send_email(
            to_email=to_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
        )

    def send_order_confirmation(self, order: Order) -> bool:
        """Envoie l'e-mail de confirmation de commande au client avec récapitulatif complet."""
        if not order.customer_email:
            logger.info(
                "Aucune adresse e-mail client pour la commande %s. E-mail de confirmation ignoré.",
                order.reference,
            )
            return False

        subject = f"Confirmation de votre commande {order.reference} — Myintimy"
        frontend_url = self.settings.frontend_url.rstrip("/")
        status_label = ORDER_STATUS_LABELS.get(order.status, order.status)
        payment_desc = PAYMENT_METHOD_LABELS.get(order.payment_method, order.payment_method)

        # Construction de la liste des articles
        items_text_lines = []
        items_html_rows = []

        for item in order.items:
            variant_desc = f"{item.color_name}" + (f" - T. {item.size_code}" if item.size_code else "")
            items_text_lines.append(
                f"- {item.product_name} ({variant_desc}) x{item.quantity} : {item.line_total_xof:,} FCFA (P.U. : {item.unit_price_xof:,} FCFA)"
            )
            items_html_rows.append(f"""
              <tr style="border-bottom:1px solid #F2EAEC;">
                <td style="padding:12px 8px;font-size:14px;">
                  <strong>{item.product_name}</strong><br>
                  <span style="font-size:12px;color:#6E6268;">{variant_desc}</span>
                </td>
                <td style="padding:12px 8px;font-size:14px;text-align:right;white-space:nowrap;color:#6E6268;">{item.unit_price_xof:,} FCFA</td>
                <td style="padding:12px 8px;font-size:14px;text-align:center;">{item.quantity}</td>
                <td style="padding:12px 8px;font-size:14px;text-align:right;white-space:nowrap;font-weight:600;">{item.line_total_xof:,} FCFA</td>
              </tr>
            """)

        items_text = "\n".join(items_text_lines)
        items_html = "".join(items_html_rows)
        shipping_desc = f"{order.shipping_xof:,} FCFA" if order.shipping_xof > 0 else "Offerte"
        packaging_desc = "Emballage discret et neutre" if order.neutral_packaging else "Emballage standard"

        text_content = f"""Bonjour {order.customer_name},

Nous vous remercions pour votre commande sur Myintimy !
Votre commande référence {order.reference} a bien été enregistrée.

RÉSUMÉ DE VOTRE COMMANDE :
--------------------------------------------------
Référence de commande : {order.reference}
Statut initial : {status_label}
Mode de règlement : {payment_desc}
--------------------------------------------------

ARTICLES COMMANDÉS :
--------------------------------------------------
{items_text}
--------------------------------------------------
Sous-total : {order.subtotal_xof:,} FCFA
Frais de livraison : {shipping_desc}
TOTAL TTC : {order.total_xof:,} FCFA

ADRESSE DE LIVRAISON :
Destinataire : {order.customer_name} ({order.customer_phone})
Adresse : {order.address}
Quartier / Ville : {order.area}, {order.city}
Conditionnement : {packaging_desc}

Une question concernant votre commande ? Répondez directement à cet e-mail.

L'équipe Myintimy
{frontend_url}
"""

        html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#FAF7F5;font-family:'Jost',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#16111A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #F2EAEC;">
    <tr>
      <td style="padding:28px 32px;background-color:#5B2A4E;color:#FAF7F5;text-align:center;">
        <h1 style="margin:0;font-family:'Cormorant Garamond',serif;font-size:28px;letter-spacing:1px;font-weight:600;">Myintimy</h1>
        <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">Confirmation de commande</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 8px 0;font-family:'Cormorant Garamond',serif;font-size:22px;color:#5B2A4E;">Merci pour votre confiance, {order.customer_name} !</h2>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">
          Votre commande <strong>{order.reference}</strong> a bien été enregistrée et nous préparons votre colis avec le plus grand soin.
        </p>

        <!-- Bloc Récapitulatif Clé (Référence, Statut initial, Mode de règlement) -->
        <div style="background-color:#FAF7F5;padding:16px;border-radius:8px;margin-bottom:24px;border:1px solid #F2EAEC;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:14px;">
            <tr>
              <td style="padding:4px 0;color:#6E6268;">Référence :</td>
              <td align="right" style="padding:4px 0;font-weight:bold;color:#16111A;">{order.reference}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6E6268;">Statut initial :</td>
              <td align="right" style="padding:4px 0;">
                <span style="display:inline-block;background-color:#5B2A4E;color:#FFFFFF;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">
                  {status_label}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6E6268;">Mode de règlement :</td>
              <td align="right" style="padding:4px 0;color:#16111A;">{payment_desc}</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size:16px;margin:24px 0 12px 0;color:#5B2A4E;border-bottom:2px solid #F2EAEC;padding-bottom:6px;">Articles commandés</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
          <thead>
            <tr style="border-bottom:2px solid #F2EAEC;font-size:12px;color:#6E6268;text-transform:uppercase;">
              <th align="left" style="padding:8px;">Article</th>
              <th align="right" style="padding:8px;">P.U.</th>
              <th align="center" style="padding:8px;">Qté</th>
              <th align="right" style="padding:8px;">Total</th>
            </tr>
          </thead>
          <tbody>
            {items_html}
          </tbody>
        </table>

        <!-- Totaux (Sous-total, Livraison, Total TTC) -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:14px;margin-bottom:24px;">
          <tr>
            <td style="padding:4px 0;color:#6E6268;">Sous-total :</td>
            <td align="right" style="padding:4px 0;">{order.subtotal_xof:,} FCFA</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6E6268;">Frais de livraison :</td>
            <td align="right" style="padding:4px 0;">{shipping_desc}</td>
          </tr>
          <tr style="font-size:16px;font-weight:bold;color:#5B2A4E;">
            <td style="padding:8px 0;border-top:1px solid #F2EAEC;">Total TTC :</td>
            <td align="right" style="padding:8px 0;border-top:1px solid #F2EAEC;">{order.total_xof:,} FCFA</td>
          </tr>
        </table>

        <!-- Adresse et livraison -->
        <div style="background-color:#FAF7F5;padding:16px;border-radius:8px;margin-bottom:24px;">
          <h4 style="margin:0 0 8px 0;font-size:14px;color:#5B2A4E;">Informations de livraison</h4>
          <p style="margin:0;font-size:13px;line-height:1.6;">
            <strong>Destinataire :</strong> {order.customer_name} ({order.customer_phone})<br>
            <strong>Adresse :</strong> {order.address}, {order.area}, {order.city}<br>
            <strong>Mode de règlement :</strong> {payment_desc}<br>
            <strong>Conditionnement :</strong> {packaging_desc}
          </p>
        </div>

        <p style="font-size:13px;line-height:1.5;color:#6E6268;margin:0;">
          Une question ou une précision pour le livreur ? Vous pouvez répondre directement à cet e-mail.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background-color:#FAF7F5;text-align:center;font-size:12px;color:#94868B;">
        © Myintimy — Tous droits réservés.
      </td>
    </tr>
  </table>
</body>
</html>
"""

        return self.send_email(
            to_email=order.customer_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
        )

    def send_admin_order_notification(self, order: Order) -> bool:
        """Envoie une notification par e-mail à l'équipe d'administration lors d'une nouvelle commande."""
        recipients = self.settings.admin_recipients
        if not recipients:
            logger.info("Aucun destinataire administrateur configuré. Notification admin ignorée.")
            return False

        payment_desc = {
            "cash_on_delivery": "Paiement à la livraison (espèces)",
            "wave": "Wave Mobile Money",
            "orange_money": "Orange Money",
            "mtn_money": "MTN Mobile Money",
            "card": "Carte bancaire",
        }.get(order.payment_method, order.payment_method)

        shipping_desc = f"{order.shipping_xof:,} FCFA" if order.shipping_xof > 0 else "Offerte"
        packaging_desc = "Emballage discret et neutre" if order.neutral_packaging else "Emballage standard Myintimy"
        admin_order_url = f"{self.settings.frontend_url.rstrip('/')}/#/admin/orders/{order.id}"

        subject = f"[Nouvelle commande] {order.reference} — {order.total_xof:,} FCFA ({order.customer_name})"

        items_lines_text = [
            f"- {item.product_name} (Réf: {item.sku or 'N/A'}) x{item.quantity} — {item.line_total_xof:,} FCFA"
            for item in order.items
        ]
        items_summary_text = "\n".join(items_lines_text)

        items_rows_html = "".join(
            f"""<tr>
              <td style="padding:10px 0;border-bottom:1px solid #F2EAEC;">
                <div style="font-weight:600;color:#16111A;font-size:14px;">{item.product_name}</div>
                <div style="font-size:12px;color:#94868B;">Réf : {item.sku or 'N/A'}{f' &bull; {item.size_code}' if item.size_code else ''}</div>
              </td>
              <td align="right" style="padding:10px 0;border-bottom:1px solid #F2EAEC;color:#6E6268;font-size:13px;">{item.unit_price_xof:,} FCFA</td>
              <td align="center" style="padding:10px 0;border-bottom:1px solid #F2EAEC;font-weight:600;color:#16111A;font-size:14px;">{item.quantity}</td>
              <td align="right" style="padding:10px 0;border-bottom:1px solid #F2EAEC;font-weight:bold;color:#16111A;font-size:14px;">{item.line_total_xof:,} FCFA</td>
            </tr>"""
            for item in order.items
        )

        text_content = f"""Une nouvelle commande vient d'être enregistrée sur Myintimy.

Référence : {order.reference}
Montant total : {order.total_xof:,} FCFA (Sous-total : {order.subtotal_xof:,} FCFA, Livraison : {shipping_desc})
Mode de règlement : {payment_desc} (Statut : {order.payment_status})

Client : {order.customer_name}
Téléphone : {order.customer_phone}
E-mail : {order.customer_email or 'Non renseigné'}
Adresse de livraison : {order.address}, {order.area}, {order.city}
Conditionnement : {packaging_desc}

Articles commandés :
{items_summary_text}

Consulter la commande dans l'administration :
{admin_order_url}
"""

        html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:24px 0;background-color:#FAF7F5;font-family:'Jost',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16111A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #F2EAEC;box-shadow:0 4px 12px rgba(22,17,26,0.04);">
    <tr>
      <td style="padding:24px 32px;background-color:#5B2A4E;color:#FFFFFF;">
        <span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.85;">Back-office Myintimy</span>
        <h1 style="margin:4px 0 0 0;font-family:'Cormorant Garamond',serif;font-size:24px;color:#FFFFFF;font-weight:600;">
          Nouvelle commande reçue
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">
          Une nouvelle commande vient d'être passée sur la boutique en ligne. Voici le récapitulatif pour traitement :
        </p>

        <!-- Bloc Récapitulatif Clé -->
        <div style="background-color:#FAF7F5;padding:16px 20px;border-radius:8px;margin-bottom:24px;border:1px solid #F2EAEC;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:14px;">
            <tr>
              <td style="padding:4px 0;color:#6E6268;">Référence :</td>
              <td align="right" style="padding:4px 0;font-weight:bold;color:#5B2A4E;">{order.reference}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6E6268;">Montant total :</td>
              <td align="right" style="padding:4px 0;font-weight:bold;color:#16111A;font-size:16px;">{order.total_xof:,} FCFA</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6E6268;">Mode de règlement :</td>
              <td align="right" style="padding:4px 0;color:#16111A;">{payment_desc}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6E6268;">Statut du règlement :</td>
              <td align="right" style="padding:4px 0;color:#16111A;">{order.payment_status}</td>
            </tr>
          </table>
        </div>

        <!-- Coordonnées Client & Livraison -->
        <div style="border:1px solid #F2EAEC;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <h3 style="margin:0 0 12px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#5B2A4E;">Client & Livraison</h3>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.6;">
            <tr>
              <td style="padding:3px 0;color:#6E6268;width:120px;">Client :</td>
              <td style="padding:3px 0;color:#16111A;font-weight:600;">{order.customer_name}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#6E6268;">Téléphone :</td>
              <td style="padding:3px 0;color:#16111A;"><a href="tel:{order.customer_phone}" style="color:#5B2A4E;text-decoration:none;font-weight:600;">{order.customer_phone}</a></td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#6E6268;">E-mail :</td>
              <td style="padding:3px 0;color:#16111A;">{order.customer_email or 'Non renseigné'}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#6E6268;">Destination :</td>
              <td style="padding:3px 0;color:#16111A;">{order.address}, {order.area}, {order.city}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#6E6268;">Emballage :</td>
              <td style="padding:3px 0;color:#16111A;">{packaging_desc}</td>
            </tr>
          </table>
        </div>

        <!-- Articles commandés -->
        <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 12px 0;color:#5B2A4E;border-bottom:2px solid #F2EAEC;padding-bottom:6px;">Détail des articles</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px;margin-bottom:20px;">
          <thead>
            <tr style="border-bottom:1px solid #F2EAEC;color:#6E6268;font-size:12px;text-transform:uppercase;">
              <th align="left" style="padding:6px 0;">Article</th>
              <th align="right" style="padding:6px 0;width:90px;">P.U.</th>
              <th align="center" style="padding:6px 0;width:50px;">Qté</th>
              <th align="right" style="padding:6px 0;width:100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            {items_rows_html}
          </tbody>
        </table>

        <!-- Totaux -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px;margin-bottom:28px;">
          <tr>
            <td style="padding:3px 0;color:#6E6268;">Sous-total articles :</td>
            <td align="right" style="padding:3px 0;">{order.subtotal_xof:,} FCFA</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#6E6268;">Frais de livraison :</td>
            <td align="right" style="padding:3px 0;">{shipping_desc}</td>
          </tr>
          <tr style="font-size:15px;font-weight:bold;color:#5B2A4E;">
            <td style="padding:8px 0;border-top:1px solid #F2EAEC;">Total commande :</td>
            <td align="right" style="padding:8px 0;border-top:1px solid #F2EAEC;">{order.total_xof:,} FCFA</td>
          </tr>
        </table>

        <!-- Bouton CTA vers l'admin -->
        <div style="text-align:center;margin:32px 0 16px 0;">
          <a href="{admin_order_url}" style="display:inline-block;background-color:#5B2A4E;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">
            Consulter la commande dans l'administration &rarr;
          </a>
        </div>
        <p style="font-size:12px;color:#94868B;text-align:center;margin:0 0 8px 0;word-break:break-all;">
          Lien direct : <a href="{admin_order_url}" style="color:#5B2A4E;">{admin_order_url}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background-color:#FAF7F5;text-align:center;font-size:12px;color:#94868B;">
        Notification automatique envoyée à l'équipe Myintimy.
      </td>
    </tr>
  </table>
</body>
</html>
"""

        return self.send_email(
            to_email=recipients,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
        )
