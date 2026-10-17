from __future__ import annotations

import secrets

from fastapi import Response

from app.core.config import get_settings


def _cookie_names(role: str) -> tuple[str, str]:
    settings = get_settings()
    prefix = "__Host-" if settings.secure_cookies else ""
    return (
        f"{prefix}myintimy_{role}_session",
        f"{prefix}myintimy_{role}_csrf",
    )


def session_cookie_name(role: str) -> str:
    return _cookie_names(role)[0]


def csrf_cookie_name(role: str) -> str:
    return _cookie_names(role)[1]


def set_auth_cookies(response: Response, *, role: str, token: str, expires_in: int) -> str:
    settings = get_settings()
    session_name, csrf_name = _cookie_names(role)
    csrf_token = secrets.token_urlsafe(32)
    common = {
        "max_age": expires_in,
        "secure": settings.secure_cookies,
        "samesite": settings.auth_cookie_samesite,
        "path": "/",
    }
    response.set_cookie(session_name, token, httponly=True, **common)
    response.set_cookie(csrf_name, csrf_token, httponly=False, **common)
    response.headers["X-CSRF-Token"] = csrf_token
    response.headers["Cache-Control"] = "no-store"
    return csrf_token


def clear_auth_cookies(response: Response, *, role: str) -> None:
    settings = get_settings()
    session_name, csrf_name = _cookie_names(role)
    common = {
        "secure": settings.secure_cookies,
        "samesite": settings.auth_cookie_samesite,
        "path": "/",
    }
    response.delete_cookie(session_name, httponly=True, **common)
    response.delete_cookie(csrf_name, httponly=False, **common)
    response.headers["Cache-Control"] = "no-store"
