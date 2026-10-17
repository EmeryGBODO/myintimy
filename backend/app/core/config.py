from functools import lru_cache

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Myintimy API"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://myintimy:myintimy@localhost:5432/myintimy"
    frontend_origins: str = Field(default="http://localhost:5173")
    log_level: str = "INFO"
    jwt_secret: str = "development-only-change-me-before-production"
    admin_access_token_minutes: int = 480
    customer_access_token_minutes: int = 10080
    customer_password_reset_minutes: int = 30
    media_root: str = "media"
    max_product_image_bytes: int = 5 * 1024 * 1024
    kkiapay_public_key: str = ""
    kkiapay_private_key: str = ""
    kkiapay_secret_key: str = ""
    kkiapay_webhook_secret: str = ""
    kkiapay_sandbox: bool = True
    payment_session_minutes: int = 15
    payment_verify_max_attempts: int = 10
    payment_reconcile_batch_size: int = 100
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    admin_login_max_attempts: int = 5
    admin_login_window_seconds: int = 600
    customer_login_max_attempts: int = 8
    customer_login_window_seconds: int = 600
    customer_register_max_attempts: int = 5
    customer_register_window_seconds: int = 3600
    password_reset_max_attempts: int = 5
    password_reset_window_seconds: int = 3600
    payment_verify_ip_max_attempts: int = 20
    payment_verify_ip_window_seconds: int = 600

    @property
    def secure_cookies(self) -> bool:
        return self.app_env.lower() not in {"development", "test"}

    def validate_security(self) -> None:
        if self.app_env.lower() != "production":
            return
        if self.debug:
            raise RuntimeError("DEBUG doit être désactivé en production.")
        if self.jwt_secret == "development-only-change-me-before-production" or len(self.jwt_secret) < 32:
            raise RuntimeError("JWT_SECRET doit être remplacé par un secret fort d'au moins 32 caractères en production.")
        if not self.cors_origins or any(origin == "*" for origin in self.cors_origins):
            raise RuntimeError("FRONTEND_ORIGINS doit contenir uniquement les origines exactes autorisées en production.")
        if self.auth_cookie_samesite == "none" and not self.secure_cookies:
            raise RuntimeError("SameSite=None nécessite des cookies Secure.")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
