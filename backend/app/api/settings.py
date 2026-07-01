from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.core.config import settings as app_settings
from app.models.settings import AppSettings, SettingsRead, SettingsUpdate
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["settings"])

NEO4J_KEYS = {"neo4j_uri", "neo4j_user", "neo4j_password"}

# Mapping from DB key to Settings attribute name
SETTINGS_ATTR = {
    "ai_provider": "AI_PROVIDER",
    "ollama_base_url": "OLLAMA_BASE_URL",
    "ollama_model": "OLLAMA_MODEL",
    "anthropic_api_key": "ANTHROPIC_API_KEY",
    "claude_model": "CLAUDE_MODEL",
    "google_api_key": "GOOGLE_API_KEY",
    "gemini_model": "GEMINI_MODEL",
    "telegram_bot_token": "TELEGRAM_BOT_TOKEN",
    "neo4j_uri": "NEO4J_URI",
    "neo4j_user": "NEO4J_USER",
    "neo4j_password": "NEO4J_PASSWORD",
}


async def _get_kv(session: AsyncSession, key: str, default: str = "") -> str:
    row = await session.get(AppSettings, key)
    return row.value if row else default


async def _set_kv(session: AsyncSession, key: str, value: str):
    row = await session.get(AppSettings, key)
    if row:
        row.value = value
    else:
        row = AppSettings(key=key, value=value)
    session.add(row)


@router.get("", response_model=SettingsRead)
async def get_settings(session: AsyncSession = Depends(get_session)):
    ai_provider = await _get_kv(session, "ai_provider", app_settings.AI_PROVIDER)
    ollama_url = await _get_kv(session, "ollama_base_url", app_settings.OLLAMA_BASE_URL)
    ollama_model = await _get_kv(session, "ollama_model", app_settings.OLLAMA_MODEL)
    claude_model = await _get_kv(session, "claude_model", app_settings.CLAUDE_MODEL)
    gemini_model = await _get_kv(session, "gemini_model", app_settings.GEMINI_MODEL)
    has_anthropic = bool(await _get_kv(session, "anthropic_api_key") or app_settings.ANTHROPIC_API_KEY)
    has_google = bool(await _get_kv(session, "google_api_key") or app_settings.GOOGLE_API_KEY)
    has_telegram = bool(await _get_kv(session, "telegram_bot_token") or app_settings.TELEGRAM_BOT_TOKEN)
    neo4j_uri = await _get_kv(session, "neo4j_uri", app_settings.NEO4J_URI)
    neo4j_user = await _get_kv(session, "neo4j_user", app_settings.NEO4J_USER)

    return SettingsRead(
        ai_provider=ai_provider,
        ollama_base_url=ollama_url,
        ollama_model=ollama_model,
        claude_model=claude_model,
        gemini_model=gemini_model,
        has_anthropic_key=has_anthropic,
        has_google_key=has_google,
        has_telegram_token=has_telegram,
        neo4j_uri=neo4j_uri,
        neo4j_user=neo4j_user,
    )


@router.patch("")
async def update_settings(data: SettingsUpdate, session: AsyncSession = Depends(get_session)):
    from app.core.neo4j_client import reset_driver

    mapping = {
        "ai_provider": data.ai_provider,
        "ollama_base_url": data.ollama_base_url,
        "ollama_model": data.ollama_model,
        "anthropic_api_key": data.anthropic_api_key,
        "claude_model": data.claude_model,
        "google_api_key": data.google_api_key,
        "gemini_model": data.gemini_model,
        "telegram_bot_token": data.telegram_bot_token,
        "neo4j_uri": data.neo4j_uri,
        "neo4j_user": data.neo4j_user,
        "neo4j_password": data.neo4j_password,
    }

    neo4j_changed = False
    for key, value in mapping.items():
        if value is not None:
            await _set_kv(session, key, value)
            attr = SETTINGS_ATTR.get(key)
            if attr:
                setattr(app_settings, attr, value)
            if key in NEO4J_KEYS:
                neo4j_changed = True

    await session.commit()

    if neo4j_changed:
        await reset_driver()

    return {"status": "ok"}


class Neo4jTestRequest(BaseModel):
    uri: str
    user: str
    password: str


@router.post("/neo4j/test")
async def test_neo4j(req: Neo4jTestRequest):
    from app.core.neo4j_client import test_connection
    return await test_connection(req.uri, req.user, req.password)


@router.get("/ollama/models")
async def list_ollama_models(session: AsyncSession = Depends(get_session)):
    import httpx
    base_url = await _get_kv(session, "ollama_base_url", app_settings.OLLAMA_BASE_URL)
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{base_url}/api/tags")
            data = resp.json()
            return {"models": [m["name"] for m in data.get("models", [])]}
    except Exception as e:
        return {"models": [], "error": str(e)}
