from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.core.neo4j_client import close_driver
from app.api import categories, notes, links, graph, chat, settings as settings_router
from app.models.category import Category
from sqlmodel import select
from app.core.database import async_session
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_categories():
    from app.api.categories import DEFAULT_CATEGORIES
    async with async_session() as session:
        result = await session.execute(select(Category))
        if result.scalars().first():
            return
        for cat_data in DEFAULT_CATEGORIES:
            session.add(Category(**cat_data))
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_categories()

    # Start Telegram bot if configured
    if settings.TELEGRAM_BOT_TOKEN:
        from app.services import telegram_service
        from app.services.ai_service import answer_from_notes
        from sqlmodel import select as sel

        async def get_notes(limit=5):
            async with async_session() as s:
                from app.models.note import Note
                result = await s.execute(sel(Note).order_by(Note.updated_at.desc()).limit(limit))
                return result.scalars().all()

        async def create_note(title, content):
            from app.models.note import Note
            from slugify import slugify
            import json
            async with async_session() as s:
                note = Note(title=title, content=content, slug=slugify(title) or "note", tags="[]")
                s.add(note)
                await s.commit()
                await s.refresh(note)
                return note

        async def search_notes(query, limit=5):
            from app.models.note import Note
            from sqlmodel import or_
            async with async_session() as s:
                result = await s.execute(
                    sel(Note).where(
                        or_(Note.title.ilike(f"%{query}%"), Note.content.ilike(f"%{query}%"))
                    ).limit(limit)
                )
                return result.scalars().all()

        async def answer_fn(question):
            notes = await get_notes(limit=20)
            context = "\n\n".join(f"### {n.title}\n{n.summary or n.content[:400]}" for n in notes)
            return await answer_from_notes(question, context)

        import asyncio
        asyncio.create_task(
            telegram_service.start_bot(get_notes, create_note, search_notes, answer_fn)
        )

    logger.info("Agentic Notes backend started")
    yield

    await close_driver()
    if settings.TELEGRAM_BOT_TOKEN:
        from app.services import telegram_service
        await telegram_service.stop_bot()


app = FastAPI(
    title="Agentic Notes API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(links.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
