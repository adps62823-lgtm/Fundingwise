from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserBase(BaseModel):
    firebase_uid: Optional[str] = None
    email: EmailStr
    name: str
    role: Literal["citizen", "official", "admin"]
    organization_id: Optional[str] = None
    active: bool = True


class UserProfileUpsert(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["citizen", "official", "admin"]] = None
    organization_id: Optional[str] = None


class UserInDB(UserBase):
    id: Optional[str] = None
    photo_url: Optional[str] = None
    email_verified: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class UserPublic(UserBase):
    id: str
    created_at: datetime
    photo_url: Optional[str] = None
    email_verified: bool = False

    @classmethod
    def from_doc(cls, doc: dict) -> "UserPublic":
        return cls(
            id=str(doc["_id"]),
            firebase_uid=doc.get("firebase_uid"),
            email=doc["email"],
            name=doc["name"],
            role=doc["role"],
            organization_id=doc.get("organization_id"),
            active=doc.get("active", True),
            created_at=doc.get("created_at", utcnow()),
            photo_url=doc.get("photo_url"),
            email_verified=doc.get("email_verified", False),
        )
