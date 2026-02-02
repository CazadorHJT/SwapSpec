from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/postgres"
    secret_key: str = "dev-secret-key-change-in-production"
    anthropic_api_key: str = ""
    storage_path: str = "./uploads"
    access_token_expire_minutes: int = 60
    supabase_url: str = ""
    supabase_anon_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
