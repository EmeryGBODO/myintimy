from __future__ import annotations

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.core.security import decode_admin_token
from app.db.session import get_db
from app.models.admin import AdminUser

_admin_bearer = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_admin_bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise ApiException(status_code=401, code="ADMIN_AUTH_REQUIRED", message="Authentification administrateur requise.")
    admin_id = decode_admin_token(credentials.credentials)
    admin = db.get(AdminUser, admin_id)
    if not admin or not admin.is_active:
        raise ApiException(status_code=401, code="ADMIN_DISABLED", message="Ce compte administrateur n'est plus actif.")
    return admin


__all__ = ["get_db", "get_current_admin"]
