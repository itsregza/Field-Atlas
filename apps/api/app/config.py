from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    port: int = 8787
    host: str = "127.0.0.1"
    web_origin: str = "http://localhost:5173"
    environment: str = "development"
    database_url: str = (
        "postgresql+psycopg://fieldatlas:fieldatlas@127.0.0.1:5432/fieldatlas"
    )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            part.strip().rstrip("/")
            for part in self.web_origin.split(",")
            if part.strip()
        ]
        return origins or ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
