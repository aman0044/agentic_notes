from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class CategoryBase(SQLModel):
    name: str = Field(index=True, unique=True)
    color: str = "#6366f1"
    icon: str = "folder"
    description: Optional[str] = None


class Category(CategoryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: int
    created_at: datetime
