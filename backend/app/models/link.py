from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import datetime
import json


class LinkBase(SQLModel):
    url: str
    title: Optional[str] = None
    summary: Optional[str] = None
    favicon: Optional[str] = None


class Link(LinkBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tags: str = Field(default="[]")
    note_id: Optional[int] = Field(default=None, foreign_key="note.id")
    scraped_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def get_tags(self) -> List[str]:
        return json.loads(self.tags)


class LinkCreate(SQLModel):
    url: str


class LinkRead(SQLModel):
    id: int
    url: str
    title: Optional[str]
    summary: Optional[str]
    favicon: Optional[str]
    tags: List[str]
    note_id: Optional[int]
    scraped_at: Optional[datetime]
    created_at: datetime
