from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.auth_cookies import session_cookie_name
from app.core.exceptions import ApiException
from app.core.security import decode_admin_token, decode_customer_token
from app.db.session import get_db
from app.models.admin import AdminUser
from app.models.client import CustomerUser

_admin_bearer = HTTPBearer(auto_error=False)
_customer_bearer = HTTPBearer(auto_error=False)


def _token_from_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
    *,
    role: str,
) -> str | None:
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    cookie_token = request.cookies.get(session_cookie_name(role))
    if cookie_token:
        return cookie_token
    return None


def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_admin_bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    token = _token_from_request(request, credentials, role="admin")
    if not token:
        raise ApiException(status_code=401, code="ADMIN_AUTH_REQUIRED", message="Authentification administrateur requise.")
    admin_id = decode_admin_token(token)
    admin = db.get(AdminUser, admin_id)
    if not admin or not admin.is_active:
        raise ApiException(status_code=401, code="ADMIN_DISABLED", message="Ce compte administrateur n'est plus actif.")
    return admin


def get_current_customer(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_customer_bearer),
    db: Session = Depends(get_db),
) -> CustomerUser:
    token = _token_from_request(request, credentials, role="customer")
    if not token:
        raise ApiException(status_code=401, code="CUSTOMER_AUTH_REQUIRED", message="Authentification client requise.")
    customer_id = decode_customer_token(token)
    customer = db.get(CustomerUser, customer_id)
    if not customer or not customer.is_active:
        raise ApiException(status_code=401, code="CUSTOMER_DISABLED", message="Ce compte client n'est plus actif.")
    return customer


def get_optional_customer(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_customer_bearer),
    db: Session = Depends(get_db),
) -> CustomerUser | None:
    token = _token_from_request(request, credentials, role="customer")
    if not token:
        return None
    customer_id = decode_customer_token(token)
    customer = db.get(CustomerUser, customer_id)
    if not customer or not customer.is_active:
        raise ApiException(status_code=401, code="CUSTOMER_DISABLED", message="Ce compte client n'est plus actif.")
    return customer


__all__ = ["get_db", "get_current_admin", "get_current_customer", "get_optional_customer"]
