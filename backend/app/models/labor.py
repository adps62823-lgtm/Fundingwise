from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Worker(BaseModel):
    id: Optional[str] = None
    org_id: str
    name: str
    code: str
    role: str
    phone: str
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Assignment(BaseModel):
    id: Optional[str] = None
    org_id: str
    project_id: str
    task_index: int
    worker_ids: list[str] = Field(default_factory=list)
    status: Literal["scheduled", "in_progress", "done", "skipped"] = "scheduled"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
