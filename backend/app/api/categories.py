from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.models.category import Category, CategoryCreate, CategoryRead
from typing import List

router = APIRouter(prefix="/categories", tags=["categories"])

DEFAULT_CATEGORIES = [
    {"name": "Personal", "color": "#6366f1", "icon": "user"},
    {"name": "Work", "color": "#0ea5e9", "icon": "briefcase"},
    {"name": "Research", "color": "#8b5cf6", "icon": "beaker"},
    {"name": "Ideas", "color": "#f59e0b", "icon": "lightbulb"},
    {"name": "Links", "color": "#10b981", "icon": "link"},
    {"name": "Journal", "color": "#ec4899", "icon": "book-open"},
]


@router.get("", response_model=List[CategoryRead])
async def list_categories(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Category))
    return result.scalars().all()


@router.post("", response_model=CategoryRead, status_code=201)
async def create_category(data: CategoryCreate, session: AsyncSession = Depends(get_session)):
    cat = Category.model_validate(data)
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return cat


@router.delete("/{cat_id}", status_code=204)
async def delete_category(cat_id: int, session: AsyncSession = Depends(get_session)):
    cat = await session.get(Category, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    await session.delete(cat)
    await session.commit()
