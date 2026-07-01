"""Fetch a URL, extract content, summarize, and auto-tag."""
import httpx
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import urlparse
from app.services import ai_service
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


async def scrape(url: str) -> dict:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=HEADERS) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        html = resp.text

    soup = BeautifulSoup(html, "html.parser")

    title = ""
    if soup.title:
        title = soup.title.string or ""
    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title:
            title = og_title.get("content", "")

    description = ""
    og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
    if og_desc:
        description = og_desc.get("content", "")

    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    main = soup.find("main") or soup.find("article") or soup.find("body")
    raw_text = main.get_text(separator="\n", strip=True) if main else ""
    raw_text = "\n".join(line for line in raw_text.splitlines() if line.strip())[:5000]

    domain = urlparse(url).netloc
    favicon = f"https://{domain}/favicon.ico"

    full_text = f"{title}\n{description}\n{raw_text}"

    try:
        summary = await ai_service.summarize_text(full_text, max_words=120)
        tags = await ai_service.extract_tags(title, full_text)
    except Exception as e:
        logger.warning(f"AI enrichment failed for {url}: {e}")
        summary = description or raw_text[:200]
        tags = []

    note_content = (
        f"# {title}\n\n"
        f"> Source: [{url}]({url})\n\n"
        f"## Summary\n\n{summary}\n\n"
        f"## Full Content\n\n{raw_text[:3000]}"
    )

    return {
        "title": title.strip(),
        "summary": summary,
        "tags": tags,
        "favicon": favicon,
        "note_content": note_content,
    }
