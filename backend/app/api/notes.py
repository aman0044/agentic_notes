from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlmodel import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.models.note import Note, NoteCreate, NoteUpdate, NoteRead
from app.models.category import Category
from app.services import markdown_service, ai_service, graph_service
from slugify import slugify
from datetime import datetime
from typing import List, Optional
import json

router = APIRouter(prefix="/notes", tags=["notes"])


def _to_read(note: Note) -> NoteRead:
    return NoteRead(
        id=note.id,
        title=note.title,
        content=note.content,
        slug=note.slug,
        tags=note.get_tags(),
        category_id=note.category_id,
        summary=note.summary,
        is_pinned=note.is_pinned,
        source_url=note.source_url,
        file_path=note.file_path,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


async def _enrich_and_save(note: Note, session: AsyncSession):
    """Background: generate summary, tags, update markdown file, update graph."""
    try:
        if not note.summary:
            note.summary = await ai_service.summarize_text(note.content)
        if not note.get_tags():
            tags = await ai_service.extract_tags(note.title, note.content)
            note.set_tags(tags)

        cat_name = None
        if note.category_id:
            cat = await session.get(Category, note.category_id)
            cat_name = cat.name if cat else None

        note.file_path = await markdown_service.save_note(
            slug=note.slug,
            title=note.title,
            content=note.content,
            tags=note.get_tags(),
            category=cat_name,
            source_url=note.source_url,
        )
        note.updated_at = datetime.utcnow()
        session.add(note)
        await session.commit()

        await graph_service.upsert_note_graph(
            note_id=note.id,
            title=note.title,
            content=note.content,
            tags=note.get_tags(),
            category=cat_name,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Background enrichment failed for note {note.id}: {e}")


@router.get("", response_model=List[NoteRead])
async def list_notes(
    category_id: Optional[int] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    pinned: Optional[bool] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
):
    q = select(Note)
    if category_id is not None:
        q = q.where(Note.category_id == category_id)
    if pinned is not None:
        q = q.where(Note.is_pinned == pinned)
    if tag:
        q = q.where(Note.tags.contains(tag))
    if search:
        q = q.where(
            or_(
                Note.title.ilike(f"%{search}%"),
                Note.content.ilike(f"%{search}%"),
                Note.summary.ilike(f"%{search}%"),
            )
        )
    q = q.order_by(Note.is_pinned.desc(), Note.updated_at.desc()).offset(offset).limit(limit)
    result = await session.execute(q)
    notes = result.scalars().all()
    return [_to_read(n) for n in notes]


@router.get("/{note_id}", response_model=NoteRead)
async def get_note(note_id: int, session: AsyncSession = Depends(get_session)):
    note = await session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    return _to_read(note)


@router.post("", response_model=NoteRead, status_code=201)
async def create_note(
    data: NoteCreate,
    background: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    base_slug = slugify(data.title) or "note"
    slug = base_slug
    counter = 1
    while (await session.execute(select(Note).where(Note.slug == slug))).scalars().first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    note = Note(
        title=data.title,
        content=data.content,
        category_id=data.category_id,
        is_pinned=data.is_pinned,
        source_url=data.source_url,
        slug=slug,
        tags=json.dumps(data.tags),
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)
    background.add_task(_enrich_and_save, note, session)
    return _to_read(note)


@router.patch("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    background: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    note = await session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")

    if data.title is not None:
        note.title = data.title
    if data.content is not None:
        note.content = data.content
        note.summary = None  # will be regenerated
    if data.category_id is not None:
        note.category_id = data.category_id
    if data.tags is not None:
        note.set_tags(data.tags)
    if data.is_pinned is not None:
        note.is_pinned = data.is_pinned

    note.updated_at = datetime.utcnow()
    session.add(note)
    await session.commit()
    await session.refresh(note)
    background.add_task(_enrich_and_save, note, session)
    return _to_read(note)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: int, session: AsyncSession = Depends(get_session)):
    note = await session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    await markdown_service.delete_note(note.slug)
    await graph_service.delete_note_graph(note_id)
    await session.delete(note)
    await session.commit()


@router.post("/{note_id}/enrich", response_model=NoteRead)
async def enrich_note(
    note_id: int,
    background: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    note = await session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    note.summary = None
    note.set_tags([])
    background.add_task(_enrich_and_save, note, session)
    return _to_read(note)
