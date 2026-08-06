import json
from typing import List, Union
from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

# Helper to validate and parse CORS origins from JSON array string or comma-separated
def parse_origins(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str):
        if not v:
            return []
        if v.startswith("[") and v.endswith("]"):
            try:
                return json.loads(v)
            except Exception:
                pass
        return [i.strip() for i in v.split(",") if i.strip()]
    return v

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""

    # JWT Settings
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS and Frontend urls
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: Annotated[List[str], BeforeValidator(parse_origins)] = []

    # Cookie settings
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Abuse limits
    RATE_LIMIT_LOGIN_PER_MIN: int = 5

settings = Settings()
