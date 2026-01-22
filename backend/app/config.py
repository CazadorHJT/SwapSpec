from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./swapspec.db"
    secret_key: str = "dev-secret-key-change-in-production"
    anthropic_api_key: str = ""
    storage_path: str = "./uploads"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"


@lru_cache
def get_settings() -> Settings:
    return Settings()
