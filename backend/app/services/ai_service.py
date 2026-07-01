"""Unified AI service supporting Ollama, Claude, and Gemini."""
from typing import Optional
from app.core.config import settings
import httpx
import json
import logging

logger = logging.getLogger(__name__)


async def _get_ollama_model() -> str:
    """Return configured Ollama model, auto-selecting the first available if configured one is missing."""
    model = settings.OLLAMA_MODEL
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            available = [m["name"] for m in resp.json().get("models", [])]
        except Exception:
            return model  # can't reach Ollama at all; let the chat call surface the real error

    if not available:
        raise RuntimeError(
            "No models found in Ollama. Run: ollama pull llama3.2  (or any model)"
        )

    # Exact match first, then prefix match (e.g. "llama3.1" matches "llama3.1:latest")
    for m in available:
        if m == model or m.startswith(model + ":"):
            return m

    # Fall back to first available model and log a warning
    logger.warning(
        f"Ollama model '{model}' not found. Available: {available}. "
        f"Using '{available[0]}'. Change the model in Settings or run: ollama pull {model}"
    )
    settings.OLLAMA_MODEL = available[0]
    return available[0]


async def _ollama_chat(messages: list[dict]) -> str:
    model = await _get_ollama_model()
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    payload = {"model": model, "messages": messages, "stream": False}
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 404:
            raise RuntimeError(
                f"Ollama model '{model}' not found. Run: ollama pull {model}"
            )
        resp.raise_for_status()
        return resp.json()["message"]["content"]


async def _claude_chat(messages: list[dict], system: Optional[str] = None) -> str:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    kwargs: dict = {"model": settings.CLAUDE_MODEL, "max_tokens": 4096, "messages": messages}
    if system:
        kwargs["system"] = system
    resp = await client.messages.create(**kwargs)
    return resp.content[0].text


async def _gemini_chat(messages: list[dict], system: Optional[str] = None) -> str:
    import google.generativeai as genai
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL, system_instruction=system)
    history = []
    user_msg = messages[-1]["content"] if messages else ""
    for m in messages[:-1]:
        role = "user" if m["role"] == "user" else "model"
        history.append({"role": role, "parts": [m["content"]]})
    chat = model.start_chat(history=history)
    resp = await chat.send_message_async(user_msg)
    return resp.text


async def chat(
    messages: list[dict],
    system: Optional[str] = None,
    provider: Optional[str] = None,
) -> str:
    p = provider or settings.AI_PROVIDER
    try:
        if p == "claude":
            return await _claude_chat(messages, system)
        elif p == "gemini":
            return await _gemini_chat(messages, system)
        else:
            if system:
                messages = [{"role": "system", "content": system}] + messages
            return await _ollama_chat(messages)
    except Exception as e:
        logger.error(f"AI [{p}] error: {e}")
        raise


async def summarize_text(text: str, max_words: int = 100) -> str:
    prompt = f"Summarize the following text in under {max_words} words. Be concise and capture the key points:\n\n{text}"
    return await chat([{"role": "user", "content": prompt}])


async def extract_tags(title: str, content: str) -> list[str]:
    prompt = (
        f"Extract 3-6 relevant tags for this note. Return ONLY a JSON array of lowercase strings.\n"
        f"Title: {title}\nContent: {content[:1000]}"
    )
    raw = await chat([{"role": "user", "content": prompt}])
    try:
        start = raw.index("[")
        end = raw.rindex("]") + 1
        return json.loads(raw[start:end])
    except Exception:
        return []


async def extract_entities(content: str) -> dict:
    """Extract people, places, concepts, dates from note content for the knowledge graph."""
    prompt = (
        "Extract entities from this text. Return ONLY valid JSON with keys: "
        "'people' (list), 'concepts' (list), 'places' (list), 'dates' (list), 'organizations' (list).\n\n"
        f"{content[:2000]}"
    )
    raw = await chat([{"role": "user", "content": prompt}])
    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        return json.loads(raw[start:end])
    except Exception:
        return {"people": [], "concepts": [], "places": [], "dates": [], "organizations": []}


async def answer_from_notes(question: str, notes_context: str) -> str:
    system = (
        "You are a helpful assistant for an agentic note-taking app. "
        "Answer questions using the provided notes as context. "
        "Be concise and cite which notes contain the information."
    )
    prompt = f"Notes:\n{notes_context}\n\nQuestion: {question}"
    return await chat([{"role": "user", "content": prompt}], system=system)
