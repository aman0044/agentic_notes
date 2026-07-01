from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.models.note import Note
from app.services import ai_service
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    note_ids: Optional[List[int]] = None  # restrict context to specific notes


@router.post("")
async def chat(req: ChatRequest, session: AsyncSession = Depends(get_session)):
    # Build context from notes
    if req.note_ids:
        result = await session.execute(select(Note).where(Note.id.in_(req.note_ids)))
    else:
        result = await session.execute(
            select(Note).order_by(Note.updated_at.desc()).limit(20)
        )
    notes = result.scalars().all()

    context_parts = []
    for n in notes:
        part = f"### {n.title}\n{n.summary or n.content[:500]}"
        context_parts.append(part)
    notes_context = "\n\n".join(context_parts)

    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    user_question = req.messages[-1].content if req.messages else ""

    answer = await ai_service.answer_from_notes(user_question, notes_context)
    return {"answer": answer, "notes_used": len(notes)}


class QuickAskRequest(BaseModel):
    question: str


@router.post("/ask")
async def quick_ask(req: QuickAskRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Note).order_by(Note.updated_at.desc()).limit(30)
    )
    notes = result.scalars().all()
    context = "\n\n".join(f"### {n.title}\n{n.summary or n.content[:400]}" for n in notes)
    answer = await ai_service.answer_from_notes(req.question, context)
    return {"answer": answer}
