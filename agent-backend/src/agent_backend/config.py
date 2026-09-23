"""
Configuration settings for SuperBass Agent Backend.
Uses pydantic-settings to load configuration from environment variables and .env file.
"""

from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


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
