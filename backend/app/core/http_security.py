from __future__ import annotations

import hmac
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.auth_cookies import csrf_cookie_name, session_cookie_name
from app.core.config import get_settings
from app.core.exceptions import error_payload

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
_CSRF_EXEMPT_PATHS = {
    "/api/v1/admin/auth/login",
    "/api/v1/client/auth/register",
    "/api/v1/client/auth/login",
    "/api/v1/client/auth/password-reset/request",
    "/api/v1/client/auth/password-reset/confirm",
    "/api/v1/payments/kkiapay/webhook",
}


def _role_for_request(request: Request) -> str | None:
    settings = get_settings()
    path = request.url.path
    admin_cookie = request.cookies.get(session_cookie_name("admin"))
    customer_cookie = request.cookies.get(session_cookie_name("customer"))
    if path.startswith(f"{settings.api_v1_prefix}/admin") and admin_cookie:
        return "admin"
    if customer_cookie:
        return "customer"
    if admin_cookie:
        return "admin"
    return None


def _origin_allowed(request: Request) -> bool:
    settings = get_settings()
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/") in settings.cors_origins
    referer = request.headers.get("referer")
    if not referer:
        return True
    parsed = urlsplit(referer)
    referer_origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return referer_origin in settings.cors_origins


def register_http_security(app: FastAPI) -> None:
    settings = get_settings()

    @app.middleware("http")
    async def csrf_and_security_headers(request: Request, call_next):
        role = _role_for_request(request)
        bearer_request = request.headers.get("authorization", "").lower().startswith("bearer ")
        if request.method.upper() not in _SAFE_METHODS and request.url.path not in _CSRF_EXEMPT_PATHS and role and not bearer_request:
            if not _origin_allowed(request):
                return JSONResponse(
                    status_code=403,
                    content=error_payload("CSRF_ORIGIN_REJECTED", "Origine de requête non autorisée."),
                )
            expected = request.cookies.get(csrf_cookie_name(role)) or ""
            provided = request.headers.get("X-CSRF-Token") or ""
            if not expected or not provided or not hmac.compare_digest(expected, provided):
                return JSONResponse(
                    status_code=403,
                    content=error_payload("CSRF_TOKEN_INVALID", "Protection CSRF invalide ou absente."),
                )

        response = await call_next(request)

        # Refresh the in-memory frontend CSRF token after any authenticated request.
        if role:
            csrf_value = request.cookies.get(csrf_cookie_name(role))
            if csrf_value:
                response.headers.setdefault("X-CSRF-Token", csrf_value)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

        sensitive_prefixes = (
            f"{settings.api_v1_prefix}/admin",
            f"{settings.api_v1_prefix}/client",
            f"{settings.api_v1_prefix}/payments",
        )
        if request.url.path.startswith(sensitive_prefixes):
            response.headers.setdefault("Cache-Control", "no-store")
        if settings.secure_cookies:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response
