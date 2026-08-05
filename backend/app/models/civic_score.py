from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CivicScoreResult(BaseModel):
    entity_type: Literal["ward", "project", "contractor"]
    entity_id: str
    score: int = Field(ge=0, le=100)
    total_reports: int
    verified_positive: int
    verified_negative: int
    last_updated: datetime = Field(default_factory=utcnow)
