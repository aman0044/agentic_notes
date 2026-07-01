from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.models.link import Link, LinkCreate, LinkRead
from app.models.note import Note, NoteCreate
from app.services import link_service
from app.api.notes import create_note as _create_note
from datetime import datetime
from typing import List
import json

router = APIRouter(prefix="/links", tags=["links"])


def _to_read(link: Link) -> LinkRead:
    return LinkRead(
        id=link.id,
        url=link.url,
        title=link.title,
        summary=link.summary,
        favicon=link.favicon,
        tags=link.get_tags(),
        note_id=link.note_id,
        scraped_at=link.scraped_at,
        created_at=link.created_at,
    )


async def _process_link(link_id: int, url: str, session: AsyncSession):
    try:
        data = await link_service.scrape(url)
        link = await session.get(Link, link_id)
        if not link:
            return

        link.title = data["title"]
        link.summary = data["summary"]
        link.favicon = data["favicon"]
        link.tags = json.dumps(data["tags"])
        link.scraped_at = datetime.utcnow()

        # Create a linked note
        from slugify import slugify
        slug = slugify(data["title"] or url)[:80] or "link"
        note = Note(
            title=data["title"] or url,
            content=data["note_content"],
            slug=slug,
            tags=json.dumps(data["tags"]),
            summary=data["summary"],
            source_url=url,
        )
        session.add(note)
        await session.flush()
        link.note_id = note.id
        session.add(link)
        await session.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Link processing failed {url}: {e}")


@router.get("", response_model=List[LinkRead])
async def list_links(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Link).order_by(Link.created_at.desc()))
    return [_to_read(l) for l in result.scalars().all()]


@router.post("", response_model=LinkRead, status_code=201)
async def add_link(
    data: LinkCreate,
    background: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    link = Link(url=data.url)
    session.add(link)
    await session.commit()
    await session.refresh(link)
    background.add_task(_process_link, link.id, link.url, session)
    return _to_read(link)


@router.delete("/{link_id}", status_code=204)
async def delete_link(link_id: int, session: AsyncSession = Depends(get_session)):
    link = await session.get(Link, link_id)
    if not link:
        raise HTTPException(404, "Link not found")
    await session.delete(link)
    await session.commit()


@router.post("/{link_id}/reprocess", response_model=LinkRead)
async def reprocess_link(
    link_id: int,
    background: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    link = await session.get(Link, link_id)
    if not link:
        raise HTTPException(404, "Link not found")
    background.add_task(_process_link, link.id, link.url, session)
    return _to_read(link)
