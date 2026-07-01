from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import datetime
import json


class NoteBase(SQLModel):
    title: str
    content: str = ""
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    is_pinned: bool = False
    source_url: Optional[str] = None


class Note(NoteBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    tags: str = Field(default="[]")  # JSON array of strings
    summary: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def get_tags(self) -> List[str]:
        return json.loads(self.tags)

    def set_tags(self, tags: List[str]):
        self.tags = json.dumps(tags)


class NoteCreate(SQLModel):
    title: str
    content: str = ""
    category_id: Optional[int] = None
    tags: List[str] = []
    is_pinned: bool = False
    source_url: Optional[str] = None


class NoteUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None


class NoteRead(SQLModel):
    id: int
    title: str
    content: str
    slug: str
    tags: List[str]
    category_id: Optional[int]
    summary: Optional[str]
    is_pinned: bool
    source_url: Optional[str]
    file_path: Optional[str]
    created_at: datetime
    updated_at: datetime
