from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_customer, get_db
from app.core.auth_cookies import clear_auth_cookies, set_auth_cookies
from app.core.config import get_settings
from app.core.rate_limit import limit_request
from app.models.client import CustomerUser
from app.schemas.client import (
    CustomerAddressIn,
    CustomerAddressOut,
    CustomerFavoriteOut,
    CustomerLoginIn,
    CustomerProfileOut,
    CustomerProfileUpdateIn,
    CustomerRegisterIn,
    CustomerTokenOut,
    PasswordResetConfirmIn,
    PasswordResetRequestIn,
    PasswordResetRequestOut,
)
from app.schemas.orders import OrderOut
from app.services.client import CustomerService

router = APIRouter(prefix="/client", tags=["client"])


@router.post("/auth/register", response_model=CustomerTokenOut, status_code=201)
def register(payload: CustomerRegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    settings = get_settings()
    limit_request(
        request,
        scope="customer-register",
        discriminator=payload.email,
        limit=settings.customer_register_max_attempts,
        window_seconds=settings.customer_register_window_seconds,
    )
    _, token, expires_in = CustomerService(db).register(payload)
    set_auth_cookies(response, role="customer", token=token, expires_in=expires_in)
    return CustomerTokenOut(access_token=token, expires_in=expires_in)


@router.post("/auth/login", response_model=CustomerTokenOut)
def login(payload: CustomerLoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    settings = get_settings()
    limit_request(
        request,
        scope="customer-login",
        discriminator=payload.email,
        limit=settings.customer_login_max_attempts,
        window_seconds=settings.customer_login_window_seconds,
    )
    _, token, expires_in = CustomerService(db).login(payload.email, payload.password)
    set_auth_cookies(response, role="customer", token=token, expires_in=expires_in)
    return CustomerTokenOut(access_token=token, expires_in=expires_in)


@router.post("/auth/logout", status_code=204)
def logout(response: Response):
    clear_auth_cookies(response, role="customer")
    response.status_code = 204
    return response


@router.post("/auth/password-reset/request", response_model=PasswordResetRequestOut)
def request_password_reset(payload: PasswordResetRequestIn, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    limit_request(
        request,
        scope="password-reset",
        discriminator=payload.email,
        limit=settings.password_reset_max_attempts,
        window_seconds=settings.password_reset_window_seconds,
    )
    token = CustomerService(db).request_password_reset(payload.email)
    expose = settings.app_env in {"development", "test"}
    return PasswordResetRequestOut(
        message="Si un compte correspond à cette adresse, un lien de réinitialisation sera envoyé.",
        development_token=token if expose else None,
    )


@router.post("/auth/password-reset/confirm", status_code=204)
def confirm_password_reset(payload: PasswordResetConfirmIn, db: Session = Depends(get_db)):
    CustomerService(db).reset_password(payload.token, payload.password)
    return Response(status_code=204)


@router.get("/me", response_model=CustomerProfileOut)
def profile(customer: CustomerUser = Depends(get_current_customer)):
    return customer


@router.patch("/me", response_model=CustomerProfileOut)
def update_profile(payload: CustomerProfileUpdateIn, customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).update_profile(customer, payload)


@router.get("/me/addresses", response_model=list[CustomerAddressOut])
def addresses(customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).list_addresses(customer)


@router.post("/me/addresses", response_model=CustomerAddressOut, status_code=201)
def create_address(payload: CustomerAddressIn, customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).create_address(customer, payload)


@router.put("/me/addresses/{address_id}", response_model=CustomerAddressOut)
def update_address(address_id: UUID, payload: CustomerAddressIn, customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).update_address(customer, address_id, payload)


@router.delete("/me/addresses/{address_id}", status_code=204)
def delete_address(address_id: UUID, customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    CustomerService(db).delete_address(customer, address_id)
    return Response(status_code=204)


@router.get("/me/favorites", response_model=list[CustomerFavoriteOut])
def favorites(customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).list_favorites(customer)


@router.post("/me/favorites/{identifier}", response_model=CustomerFavoriteOut, status_code=201)
def add_favorite(identifier: str, customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).add_favorite(customer, identifier)


@router.delete("/me/favorites/{identifier}", status_code=204)
def remove_favorite(identifier: str, customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    CustomerService(db).remove_favorite(customer, identifier)
    return Response(status_code=204)


@router.get("/me/orders", response_model=list[OrderOut])
def customer_orders(customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).list_orders(customer)


@router.get("/me/orders/{reference}", response_model=OrderOut)
def customer_order(reference: str, customer: CustomerUser = Depends(get_current_customer), db: Session = Depends(get_db)):
    return CustomerService(db).get_order(customer, reference)
