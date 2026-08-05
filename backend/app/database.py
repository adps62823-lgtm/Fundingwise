from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGO_URI)
    return client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.MONGO_DB_NAME]


async def init_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("firebase_uid", unique=True, sparse=True)
    await db.projects.create_index([("location", "2dsphere")])
    await db.reports.create_index("project_id")
    await db.organizations.create_index("slug", unique=True)
    await db.api_keys.create_index("key", unique=True)
    await db.votes.create_index([("report_id", 1), ("user_id", 1)], unique=True)


async def seed_admin_user() -> None:
    db = get_db()
    existing = await db.users.find_one({"email": settings.ADMIN_SEED_EMAIL.lower()})
    if existing:
        if existing.get("role") != "admin":
            await db.users.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin", "updated_at": datetime.now(timezone.utc)}})
        return

    now = datetime.now(timezone.utc)
    await db.users.insert_one(
        {
            "firebase_uid": None,
            "email": settings.ADMIN_SEED_EMAIL.lower(),
            "name": "Fundingwise Admin",
            "role": "admin",
            "organization_id": None,
            "photo_url": None,
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
        }
    )
