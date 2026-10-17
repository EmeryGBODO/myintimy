from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import ApiException


SANDBOX_BASE_URL = "https://api-sandbox.kkiapay.me"
PRODUCTION_BASE_URL = "https://api.kkiapay.me"
VERIFY_PATH = "/api/v1/transactions/status"


@dataclass(frozen=True)
class KkiapayVerification:
    transaction_id: str
    status: str
    amount_xof: int
    source: str | None = None
    partner_id: str | None = None
    failure_code: str | None = None
    failure_message: str | None = None


class KkiapayGateway:
    provider = "kkiapay"

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return all(
            [
                self.settings.kkiapay_public_key.strip(),
                self.settings.kkiapay_private_key.strip(),
                self.settings.kkiapay_secret_key.strip(),
                self.settings.kkiapay_webhook_secret.strip(),
            ]
        )

    def public_config(self) -> dict[str, object]:
        return {
            "enabled": self.is_configured(),
            "public_key": self.settings.kkiapay_public_key if self.is_configured() else None,
            "sandbox": self.settings.kkiapay_sandbox,
            "country": "BJ",
            "payment_method": "momo",
            "session_minutes": self.settings.payment_session_minutes,
        }

    @staticmethod
    def _read(value: Any, *keys: str, default: Any = None) -> Any:
        for key in keys:
            if isinstance(value, dict) and key in value:
                return value[key]
            if hasattr(value, key):
                return getattr(value, key)
        return default

    def _base_url(self) -> str:
        return SANDBOX_BASE_URL if self.settings.kkiapay_sandbox else PRODUCTION_BASE_URL

    def _headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-SECRET-KEY": self.settings.kkiapay_secret_key,
            "X-API-KEY": self.settings.kkiapay_public_key,
            "X-PRIVATE-KEY": self.settings.kkiapay_private_key,
        }

    def verify_transaction(self, transaction_id: str) -> KkiapayVerification:
        if not self.is_configured():
            raise ApiException(
                status_code=503,
                code="KKIAPAY_NOT_CONFIGURED",
                message="Le paiement Mobile Money n'est pas configuré.",
            )

        transaction_id = transaction_id.strip()
        if not transaction_id:
            raise ApiException(
                status_code=422,
                code="INVALID_PROVIDER_TRANSACTION_ID",
                message="La référence de transaction Kkiapay est requise.",
            )

        try:
            response = httpx.post(
                f"{self._base_url()}{VERIFY_PATH}",
                json={"transactionId": transaction_id},
                headers=self._headers(),
                timeout=10.0,
            )
            response.raise_for_status()
            result = response.json()
        except (httpx.TimeoutException, httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise ApiException(
                status_code=502,
                code="KKIAPAY_VERIFICATION_FAILED",
                message="Impossible de vérifier le paiement auprès de Kkiapay.",
            ) from exc

        status = str(self._read(result, "status", default="")).upper()
        amount = self._read(result, "amount", default=None)
        if amount is None:
            raise ApiException(
                status_code=502,
                code="KKIAPAY_INVALID_RESPONSE",
                message="La réponse de vérification Kkiapay est incomplète.",
            )

        return KkiapayVerification(
            transaction_id=str(self._read(result, "transactionId", "transaction_id", default=transaction_id)),
            status=status,
            amount_xof=int(amount),
            source=self._read(result, "source", default=None),
            partner_id=self._read(result, "partnerId", "partner_id", default=None),
            failure_code=self._read(result, "reason", "failureCode", "failure_code", default=None),
            failure_message=self._read(result, "failureMessage", "failure_message", default=None),
        )
