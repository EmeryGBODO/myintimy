from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import get_settings
from app.core.exceptions import ApiException

_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    if len(password) < 12:
        raise ValueError("Le mot de passe administrateur doit contenir au moins 12 caractères.")
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(admin_id: UUID) -> tuple[str, int]:
    settings = get_settings()
    expires_delta = timedelta(minutes=settings.admin_access_token_minutes)
    expires_at = datetime.now(UTC) + expires_delta
    payload = {
        "sub": str(admin_id),
        "type": "admin_access",
        "iat": datetime.now(UTC),
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, int(expires_delta.total_seconds())


def decode_admin_token(token: str) -> UUID:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "admin_access":
            raise ValueError("token type")
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise ApiException(status_code=401, code="INVALID_ADMIN_TOKEN", message="Session administrateur invalide ou expirée.") from exc
