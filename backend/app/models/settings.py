from sqlmodel import SQLModel, Field
from typing import Optional


class AppSettings(SQLModel, table=True):
    __tablename__ = "app_settings"
    key: str = Field(primary_key=True)
    value: str


class SettingsRead(SQLModel):
    ai_provider: str
    ollama_base_url: str
    ollama_model: str
    claude_model: str
    gemini_model: str
    has_anthropic_key: bool
    has_google_key: bool
    has_telegram_token: bool
    neo4j_uri: str
    neo4j_user: str


class SettingsUpdate(SQLModel):
    ai_provider: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    claude_model: Optional[str] = None
    google_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    neo4j_uri: Optional[str] = None
    neo4j_user: Optional[str] = None
    neo4j_password: Optional[str] = None
