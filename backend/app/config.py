from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    MONGO_URI: str = Field(default="mongodb://localhost:27017")
    MONGO_DB_NAME: str = Field(default="fundingwise")
    GEMINI_API_KEY: str | None = None
    CORS_ORIGINS: str = Field(default="http://localhost:5173")
    ADMIN_SEED_EMAIL: str = Field(default="admin@fundingwise.local")
    FIREBASE_SERVICE_ACCOUNT_JSON: str | None = None
    FIREBASE_SERVICE_ACCOUNT_PATH: str | None = None
    FIREBASE_PROJECT_ID: str | None = None
    ADMIN_SEED_PASSWORD: str = Field(default="change-me")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
