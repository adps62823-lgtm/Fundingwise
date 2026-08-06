from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.service_catalog import DEFAULT_SERVICES


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Organization(BaseModel):
    id: Optional[str] = None
    name: str
    slug: str
    type: Literal["municipal_corporation", "panchayat", "department", "admin"]
    city: str
    state: str
    poc_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    subscription_tier: Literal["trial", "standard", "enterprise"] = "trial"
    # "deleted" is a soft-delete state (see DELETE /orgs/{org_id}) - the org
    # and its history stay in the database, in keeping with the product's
    # own "nothing is ever quietly erased" philosophy, but it's hidden from
    # active lists and every microservice is gated off.
    subscription_status: Literal["pending", "active", "suspended", "deleted"] = "pending"
    # Per-microservice on/off switches, independent of subscription_status.
    # See app/models/service_catalog.py for the catalog of keys.
    services: dict = Field(default_factory=lambda: dict(DEFAULT_SERVICES))
    created_at: datetime = Field(default_factory=utcnow)
