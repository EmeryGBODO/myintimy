from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.auth_cookies import clear_auth_cookies, set_auth_cookies
from app.core.config import get_settings
from app.core.exceptions import ApiException
from app.core.rate_limit import limit_request
from app.core.security import create_access_token, verify_password
from app.models.admin import AdminUser
from app.schemas.admin import AdminLoginIn, AdminTokenOut, AdminUserOut

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminTokenOut)
def login(payload: AdminLoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    settings = get_settings()
    email = payload.email.strip().lower()
    limit_request(
        request,
        scope="admin-login",
        discriminator=email,
        limit=settings.admin_login_max_attempts,
        window_seconds=settings.admin_login_window_seconds,
    )
    admin = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email))
    if not admin or not admin.is_active or not verify_password(payload.password, admin.password_hash):
        raise ApiException(status_code=401, code="INVALID_ADMIN_CREDENTIALS", message="Email ou mot de passe incorrect.")
    admin.last_login_at = datetime.now(UTC)
    db.commit()
    db.refresh(admin)
    token, expires_in = create_access_token(admin.id)
    set_auth_cookies(response, role="admin", token=token, expires_in=expires_in)
    # access_token remains in the API response temporarily for non-browser clients.
    # The Myintimy frontend no longer persists it in Web Storage.
    return AdminTokenOut(access_token=token, expires_in=expires_in, user=admin)


@router.post("/logout", status_code=204)
def logout(response: Response):
    clear_auth_cookies(response, role="admin")
    response.status_code = 204
    return response


@router.get("/me", response_model=AdminUserOut)
def me(admin: AdminUser = Depends(get_current_admin)):
    return admin
