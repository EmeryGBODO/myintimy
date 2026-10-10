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
    media_root: str = "media"
    max_product_image_bytes: int = 5 * 1024 * 1024

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
