from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Project(BaseModel):
    id: Optional[str] = None
    org_id: str
    title: str
    description: str
    ward: str
    city: str
    location: dict
    category: Literal["road", "drain", "streetlight", "sanitation", "water_supply", "other"]
    status: Literal["planned", "in_progress", "completed", "disputed"] = "planned"
    current_version_id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
