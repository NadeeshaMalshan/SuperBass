"""
Configuration settings for SuperBass Agent Backend.
Uses pydantic-settings to load configuration from environment variables and .env file.
"""

from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


def normalize_database_url(raw: str) -> str:
    """Converts ADO.NET connection strings or standard postgres URLs to asyncpg format."""
    default_url = (
        "postgresql+asyncpg://neondb_owner:npg_0ObrwYI7dLaH@"
        "ep-blue-forest-b3zdeko1-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?ssl=require"
    )
    if not raw or not raw.strip():
        return default_url

    clean_raw = raw.strip()

    # Handle ADO.NET connection string format
    if "Host=" in clean_raw or "host=" in clean_raw:
        parts = {}
        for item in clean_raw.split(";"):
            if "=" in item:
                k, v = item.split("=", 1)
                parts[k.strip().lower()] = v.strip()
        host = parts.get("host", "localhost")
        db = parts.get("database", "neondb")
        user = parts.get("username", parts.get("user id", "neondb_owner"))
        pwd = parts.get("password", "")
        return f"postgresql+asyncpg://{user}:{pwd}@{host}/{db}?ssl=require"

    if clean_raw.startswith("postgresql://"):
        return clean_raw.replace("postgresql://", "postgresql+asyncpg://", 1)

    return clean_raw


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8001, description="Server port")
    environment: str = Field(default="development", description="Runtime environment")
    cors_origins: Union[List[str], str] = Field(
        default=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000", "*"],
        description="Allowed CORS origins"
    )

    # OpenAI configuration
    openai_api_key: str = Field(default="", description="OpenAI API Key")
    openai_model: str = Field(default="gpt-4o-mini", description="OpenAI chat model name")
    openai_temperature: float = Field(default=0.2, description="Sampling temperature")

    # SuperBass Backend API configuration
    backend_base_url: str = Field(
        default="http://localhost:5237",
        description="URL of the SuperBass ASP.NET Core Backend API"
    )
    request_timeout: float = Field(default=15.0, description="HTTP client timeout in seconds")

    # MCP Server configuration
    mcp_server_url: str = Field(
        default="http://localhost:8000/mcp",
        description="URL of the SuperBass MCP Server endpoint"
    )
    mcp_timeout: float = Field(default=30.0, description="MCP client timeout in seconds")

    # Neon PostgreSQL Database configuration
    database_url: str = Field(
        default=(
            "postgresql+asyncpg://neondb_owner:npg_0ObrwYI7dLaH@"
            "ep-blue-forest-b3zdeko1-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?ssl=require"
        ),
        description="Async SQLAlchemy database connection URL"
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def parse_db_url(cls, value: str) -> str:
        return normalize_database_url(value)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[List[str], str]) -> List[str]:
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [orig.strip() for orig in value.split(",") if orig.strip()]
        return value


settings = Settings()
