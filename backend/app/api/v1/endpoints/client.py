from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_customer, get_db
from app.core.config import get_settings
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
def register(payload: CustomerRegisterIn, db: Session = Depends(get_db)):
    _, token, expires_in = CustomerService(db).register(payload)
    return CustomerTokenOut(access_token=token, expires_in=expires_in)


@router.post("/auth/login", response_model=CustomerTokenOut)
def login(payload: CustomerLoginIn, db: Session = Depends(get_db)):
    _, token, expires_in = CustomerService(db).login(payload.email, payload.password)
    return CustomerTokenOut(access_token=token, expires_in=expires_in)


@router.post("/auth/password-reset/request", response_model=PasswordResetRequestOut)
def request_password_reset(payload: PasswordResetRequestIn, db: Session = Depends(get_db)):
    token = CustomerService(db).request_password_reset(payload.email)
    settings = get_settings()
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
