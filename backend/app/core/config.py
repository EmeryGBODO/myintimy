from functools import lru_cache

from pydantic import AliasChoices, Field
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

    # Configuration SMTP & Emails transactionnels
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = Field(default="", validation_alias=AliasChoices("smtp_user", "smtp_username"))
    smtp_password: str = ""
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout: int = 10
    mail_from_email: str = "contact@myintimy.com"
    mail_from_name: str = "Myintimy"
    mail_admin_email: str = "admin@myintimy.com"
    frontend_url: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
