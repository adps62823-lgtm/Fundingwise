from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Organization(BaseModel):
    id: Optional[str] = None
    name: str
    slug: str
    type: Literal["municipal_corporation", "panchayat", "admin"]
    city: str
    state: str
    subscription_tier: Literal["trial", "standard", "enterprise"] = "trial"
    subscription_status: Literal["pending", "active", "suspended"] = "pending"
    created_at: datetime = Field(default_factory=utcnow)
