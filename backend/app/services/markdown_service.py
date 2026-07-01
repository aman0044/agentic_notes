"""Save and load notes as markdown files (Obsidian-compatible)."""
import os
import aiofiles
from datetime import datetime
from typing import Optional
from app.core.config import settings


def _notes_dir() -> str:
    path = os.path.abspath(settings.NOTES_DIR)
    os.makedirs(path, exist_ok=True)
    return path


def _build_frontmatter(title: str, tags: list[str], category: Optional[str], source_url: Optional[str]) -> str:
    lines = ["---", f"title: {title}", f"date: {datetime.utcnow().isoformat()}"]
    if tags:
        lines.append(f"tags: [{', '.join(tags)}]")
    if category:
        lines.append(f"category: {category}")
    if source_url:
        lines.append(f"source: {source_url}")
    lines.append("---\n")
    return "\n".join(lines)


async def save_note(
    slug: str,
    title: str,
    content: str,
    tags: list[str] = None,
    category: Optional[str] = None,
    source_url: Optional[str] = None,
) -> str:
    tags = tags or []
    frontmatter = _build_frontmatter(title, tags, category, source_url)
    file_content = frontmatter + content
    file_path = os.path.join(_notes_dir(), f"{slug}.md")
    async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
        await f.write(file_content)
    return file_path


async def delete_note(slug: str):
    file_path = os.path.join(_notes_dir(), f"{slug}.md")
    if os.path.exists(file_path):
        os.remove(file_path)


async def load_note(slug: str) -> Optional[str]:
    file_path = os.path.join(_notes_dir(), f"{slug}.md")
    if not os.path.exists(file_path):
        return None
    async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
        return await f.read()
