from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class InventoryItem(BaseModel):
    id: Optional[str] = None
    org_id: str
    name: str
    type: str
    source: str
    quantity: float
    unit: str
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class DispatchRecord(BaseModel):
    id: Optional[str] = None
    org_id: str
    project_id: str
    task_index: int
    item_id: str
    destination: str
    dispatch_date: Optional[datetime] = None
    status: Literal["planned", "dispatched", "delivered", "returned"] = "planned"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
