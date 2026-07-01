from fastapi import APIRouter, Query, Depends, BackgroundTasks
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.services import graph_service
from app.models.note import Note
from app.models.link import Link
from typing import Optional

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("")
async def get_graph():
    return await graph_service.get_graph_data()


@router.get("/status")
async def graph_status():
    from app.core.neo4j_client import get_driver
    driver = await get_driver()
    if not driver:
        return {"connected": False, "message": "Neo4j unreachable — check credentials in Settings"}
    data = await graph_service.get_graph_data()
    return {"connected": True, "nodes": len(data["nodes"]), "links": len(data["links"])}


@router.get("/node-context")
async def node_context(
    label: str = Query(...),
    name: str = Query(""),
    note_id: Optional[int] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """Return context for a clicked graph node: which notes reference this entity."""
    raw = await graph_service.get_node_context(label, name, note_id)

    # Enrich with SQLite data (summary, source_url, link)
    note_rows = raw.get("rows", [])
    enriched = []
    for row in note_rows:
        nid = row.get("note_id")
        if not nid:
            continue
        note = await session.get(Note, nid)
        if not note:
            continue
        # Find associated link
        link_result = await session.execute(select(Link).where(Link.note_id == nid))
        link = link_result.scalars().first()

        enriched.append({
            "id": note.id,
            "title": note.title,
            "summary": note.summary or note.content[:200],
            "tags": note.get_tags(),
            "source_url": note.source_url,
            "link_url": link.url if link else None,
            "link_favicon": link.favicon if link else None,
            "updated_at": note.updated_at.isoformat(),
        })

    # For Note nodes, just return the note itself
    if label == "Note" and note_id:
        note = await session.get(Note, note_id)
        if note:
            link_result = await session.execute(select(Link).where(Link.note_id == note_id))
            link = link_result.scalars().first()
            enriched = [{
                "id": note.id,
                "title": note.title,
                "summary": note.summary or note.content[:200],
                "tags": note.get_tags(),
                "source_url": note.source_url,
                "link_url": link.url if link else None,
                "link_favicon": link.favicon if link else None,
                "updated_at": note.updated_at.isoformat(),
            }]

    return {
        "entity": raw["entity"],
        "notes": enriched,
        "relations": raw.get("relations", []),
    }


@router.get("/search")
async def search_graph(q: str = Query(..., min_length=1)):
    return await graph_service.search_graph(q)


@router.post("/rebuild")
async def rebuild_graph(background: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    """Re-process all notes into the knowledge graph."""
    result = await session.execute(select(Note))
    notes = result.scalars().all()

    async def _rebuild():
        from app.models.category import Category
        for note in notes:
            cat_name = None
            if note.category_id:
                cat = await session.get(Category, note.category_id)
                cat_name = cat.name if cat else None
            try:
                await graph_service.upsert_note_graph(
                    note_id=note.id,
                    title=note.title,
                    content=note.content,
                    tags=note.get_tags(),
                    category=cat_name,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Rebuild skipped note {note.id}: {e}")

    background.add_task(_rebuild)
    return {"status": "rebuilding", "notes_count": len(notes)}
