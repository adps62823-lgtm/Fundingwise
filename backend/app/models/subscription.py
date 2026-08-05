from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

SubscriptionTier = {
    "trial": {"price_inr_month": 0, "api_calls_included": 100},
    "standard": {"price_inr_month": 4999, "api_calls_included": 5000},
    "enterprise": {"price_inr_month": 19999, "api_calls_included": 50000},
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ApiKey(BaseModel):
    id: Optional[str] = None
    org_id: Optional[str] = None
    client_name: Optional[str] = None
    key: str
    label: str
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


class ApiUsageLog(BaseModel):
    id: Optional[str] = None
    api_key_id: str
    endpoint: str
    called_at: datetime = Field(default_factory=utcnow)
