from functools import lru_cache
from ipaddress import IPv4Address
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

class EnvBaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), extra="ignore")

class AuthConfig(EnvBaseSettings):
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_ttl: int = 15*60
    refresh_token_ttl: int = 7 * 24 * 60 * 60


class DatabaseConfig(EnvBaseSettings):
    db_url: str = "postgresql+asyncpg://user:pass@localhost/db"
    db_pool_size: int = 5
    db_max_overflow: int = 10

class GoogleOAuthConfig(EnvBaseSettings):
    google_client_id: str
    google_client_secret: str

class ServiceConfig(EnvBaseSettings):
    debug: bool = False
    is_production: bool = True
    port: int = 8080
    base_url: str = "http://localhost:8000"
    host: IPv4Address = IPv4Address("127.0.0.1")
    jwt: AuthConfig = Field(default_factory=AuthConfig) # type: ignore[call-arg]
    db_config: DatabaseConfig = Field(default_factory=DatabaseConfig)
    google_oauth_config: GoogleOAuthConfig = Field(default_factory=GoogleOAuthConfig) # type: ignore[call-arg]


@lru_cache
def get_config() -> ServiceConfig:
    return ServiceConfig()
