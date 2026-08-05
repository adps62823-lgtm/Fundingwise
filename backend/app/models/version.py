from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Version(BaseModel):
    id: Optional[str] = None
    project_id: str
    version_number: int
    status: Literal["ai_draft", "official_edited", "published"] = "ai_draft"
    total_estimate_inr: Optional[float] = None
    duration_days: Optional[int] = None
    cost_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    schedule: list[dict[str, Any]] = Field(default_factory=list)
    contractor_suggestions: list[dict[str, Any]] = Field(default_factory=list)
    assigned_contractor: Optional[dict[str, Any]] = None
    labor_plan: list[dict[str, Any]] = Field(default_factory=list)
    inventory_plan: list[dict[str, Any]] = Field(default_factory=list)
    risk_notes: list[str] = Field(default_factory=list)
    confidence: float = 0.7
    notes: Optional[str] = None
    edited_by: Optional[str] = None
    parent_version_id: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
