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
    # Secret ops panel path (no leading slash). Empty = disabled.
    admin_path: str = ""
    # Comma-separated owner emails allowed into the ops panel.
    admin_emails: str = ""

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
        # Expo web / Metro defaults for local mobile development
        extras = [
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
        ]
        merged = origins or ["http://localhost:5173"]
        for origin in extras:
            if origin not in merged:
                merged.append(origin)
        return merged

    @property
    def ops_path(self) -> str:
        return self.admin_path.strip().strip("/")

    @property
    def owner_emails(self) -> set[str]:
        return {
            part.strip().lower()
            for part in self.admin_emails.split(",")
            if part.strip()
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
