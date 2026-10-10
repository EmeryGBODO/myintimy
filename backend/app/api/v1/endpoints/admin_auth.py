from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.exceptions import ApiException
from app.core.security import create_access_token, verify_password
from app.models.admin import AdminUser
from app.schemas.admin import AdminLoginIn, AdminTokenOut, AdminUserOut

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminTokenOut)
def login(payload: AdminLoginIn, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    admin = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email))
    if not admin or not admin.is_active or not verify_password(payload.password, admin.password_hash):
        raise ApiException(status_code=401, code="INVALID_ADMIN_CREDENTIALS", message="Email ou mot de passe incorrect.")
    admin.last_login_at = datetime.now(UTC)
    db.commit()
    db.refresh(admin)
    token, expires_in = create_access_token(admin.id)
    return AdminTokenOut(access_token=token, expires_in=expires_in, user=admin)


@router.get("/me", response_model=AdminUserOut)
def me(admin: AdminUser = Depends(get_current_admin)):
    return admin
