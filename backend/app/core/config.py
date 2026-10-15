from functools import lru_cache

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

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
