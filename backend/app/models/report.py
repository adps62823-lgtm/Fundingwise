from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Report(BaseModel):
    id: Optional[str] = None
    project_id: str
    submitted_by: Optional[str] = None
    photo_url: str
    location: dict
    note: Optional[str] = None
    report_type: Literal["issue", "progress_update", "completion_claim"]
    verification_count_up: int = 0
    verification_count_down: int = 0
    created_at: datetime = Field(default_factory=utcnow)


class Vote(BaseModel):
    id: Optional[str] = None
    report_id: str
    user_id: str
    direction: Literal["up", "down"]
