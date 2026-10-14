from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ApiException
from app.core.security import create_customer_access_token, hash_customer_password, verify_password
from app.models.client import CustomerAddress, CustomerFavorite, CustomerPasswordResetToken, CustomerUser
from app.repositories.client import CustomerRepository
from app.schemas.client import CustomerAddressIn, CustomerProfileUpdateIn, CustomerRegisterIn


class CustomerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = CustomerRepository(db)

    def register(self, data: CustomerRegisterIn) -> tuple[CustomerUser, str, int]:
        email = data.email.strip().lower()
        if self.repository.get_by_email(email):
            raise ApiException(status_code=409, code="CUSTOMER_EMAIL_EXISTS", message="Un compte existe déjà avec cette adresse e-mail.")
        customer = CustomerUser(
            email=email,
            full_name=data.full_name.strip(),
            phone=data.phone.strip() if data.phone else None,
            password_hash=hash_customer_password(data.password),
        )
        self.db.add(customer)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ApiException(status_code=409, code="CUSTOMER_EMAIL_EXISTS", message="Un compte existe déjà avec cette adresse e-mail.") from exc
        token, expires_in = create_customer_access_token(customer.id)
        return customer, token, expires_in

    def login(self, email: str, password: str) -> tuple[CustomerUser, str, int]:
        customer = self.repository.get_by_email(email.strip().lower())
        if not customer or not customer.is_active or not verify_password(password, customer.password_hash):
            raise ApiException(status_code=401, code="INVALID_CUSTOMER_CREDENTIALS", message="E-mail ou mot de passe incorrect.")
        token, expires_in = create_customer_access_token(customer.id)
        return customer, token, expires_in

    def update_profile(self, customer: CustomerUser, data: CustomerProfileUpdateIn) -> CustomerUser:
        customer.full_name = data.full_name.strip()
        customer.phone = data.phone.strip() if data.phone else None
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def request_password_reset(self, email: str) -> str | None:
        customer = self.repository.get_by_email(email.strip().lower())
        if not customer or not customer.is_active:
            return None
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        settings = get_settings()
        token = CustomerPasswordResetToken(
            customer_id=customer.id,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.customer_password_reset_minutes),
        )
        self.db.add(token)
        self.db.commit()
        return raw

    def reset_password(self, raw_token: str, password: str) -> None:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        record = self.repository.get_reset_token(token_hash)
        now = datetime.now(UTC)
        if not record or record.used_at is not None:
            raise ApiException(status_code=400, code="INVALID_RESET_TOKEN", message="Ce lien de réinitialisation est invalide ou a déjà été utilisé.")
        expires = record.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= now:
            raise ApiException(status_code=400, code="EXPIRED_RESET_TOKEN", message="Ce lien de réinitialisation a expiré.")
        record.customer.password_hash = hash_customer_password(password)
        record.used_at = now
        self.db.commit()

    def list_addresses(self, customer: CustomerUser) -> list[CustomerAddress]:
        return self.repository.list_addresses(customer.id)

    def create_address(self, customer: CustomerUser, data: CustomerAddressIn) -> CustomerAddress:
        existing = self.repository.list_addresses(customer.id)
        make_default = data.is_default or not existing
        if make_default:
            self.repository.clear_default_addresses(customer.id)
        address = CustomerAddress(customer_id=customer.id, **data.model_dump(exclude={"is_default"}), is_default=make_default)
        self.db.add(address)
        self.db.commit()
        self.db.refresh(address)
        return address

    def update_address(self, customer: CustomerUser, address_id: UUID, data: CustomerAddressIn) -> CustomerAddress:
        address = self.repository.get_address(customer.id, address_id)
        if not address:
            raise ApiException(status_code=404, code="ADDRESS_NOT_FOUND", message="Cette adresse n'existe pas.")
        if data.is_default:
            self.repository.clear_default_addresses(customer.id, except_id=address.id)
        for key, value in data.model_dump().items():
            setattr(address, key, value)
        self.db.commit()
        self.db.refresh(address)
        return address

    def delete_address(self, customer: CustomerUser, address_id: UUID) -> None:
        address = self.repository.get_address(customer.id, address_id)
        if not address:
            raise ApiException(status_code=404, code="ADDRESS_NOT_FOUND", message="Cette adresse n'existe pas.")
        was_default = address.is_default
        self.db.delete(address)
        self.db.commit()
        if was_default:
            remaining = self.repository.list_addresses(customer.id)
            if remaining:
                remaining[0].is_default = True
                self.db.commit()

    def favorite_data(self, favorite: CustomerFavorite) -> dict:
        product = favorite.product
        return {
            "product_id": product.id,
            "public_id": str(product.legacy_id) if product.legacy_id is not None else product.slug,
            "slug": product.slug,
        }

    def list_favorites(self, customer: CustomerUser) -> list[dict]:
        return [self.favorite_data(item) for item in self.repository.list_favorites(customer.id)]

    def add_favorite(self, customer: CustomerUser, identifier: str) -> dict:
        product = self.repository.get_product(identifier)
        if not product:
            raise ApiException(status_code=404, code="PRODUCT_NOT_FOUND", message="Le produit demandé n'existe pas.")
        existing = self.repository.get_favorite(customer.id, product.id)
        if existing:
            return self.favorite_data(existing)
        favorite = CustomerFavorite(customer_id=customer.id, product_id=product.id)
        self.db.add(favorite)
        self.db.commit()
        self.db.refresh(favorite)
        favorite.product = product
        return self.favorite_data(favorite)

    def remove_favorite(self, customer: CustomerUser, identifier: str) -> None:
        product = self.repository.get_product(identifier)
        if not product:
            return
        favorite = self.repository.get_favorite(customer.id, product.id)
        if favorite:
            self.db.delete(favorite)
            self.db.commit()

    def list_orders(self, customer: CustomerUser):
        return self.repository.list_orders(customer.id)

    def get_order(self, customer: CustomerUser, reference: str):
        order = self.repository.get_order(customer.id, reference)
        if not order:
            raise ApiException(status_code=404, code="ORDER_NOT_FOUND", message="La commande demandée n'existe pas.")
        return order
