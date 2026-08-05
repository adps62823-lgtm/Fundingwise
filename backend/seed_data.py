from __future__ import annotations

import asyncio

from bson import ObjectId

from app.config import settings
from app.database import get_db
from app.utils.security import hash_password


async def main():
    db = get_db()
    admin_org = await db.organizations.find_one({"slug": "fundingwise-admin"})
    if not admin_org:
        result = await db.organizations.insert_one(
            {
                "name": "Fundingwise Admin",
                "slug": "fundingwise-admin",
                "type": "admin",
                "city": "Remote",
                "state": "NA",
                "subscription_tier": "enterprise",
                "subscription_status": "active",
                "created_at": __import__("datetime").datetime.utcnow(),
            }
        )
        admin_org = await db.organizations.find_one({"_id": result.inserted_id})

    admin_user = await db.users.find_one({"email": settings.ADMIN_SEED_EMAIL.lower()})
    if not admin_user:
        await db.users.insert_one(
            {
                "email": settings.ADMIN_SEED_EMAIL.lower(),
                "name": "Fundingwise Admin",
                "role": "admin",
                "organization_id": str(admin_org["_id"]),
                "hashed_password": hash_password(settings.ADMIN_SEED_PASSWORD),
                "created_at": __import__("datetime").datetime.utcnow(),
            }
        )

    demo_org = await db.organizations.find_one({"slug": "demo-municipal-corporation"})
    if not demo_org:
        result = await db.organizations.insert_one(
            {
                "name": "Demo Municipal Corporation",
                "slug": "demo-municipal-corporation",
                "type": "municipal_corporation",
                "city": "Indore",
                "state": "Madhya Pradesh",
                "subscription_tier": "standard",
                "subscription_status": "active",
                "created_at": __import__("datetime").datetime.utcnow(),
            }
        )
        demo_org = await db.organizations.find_one({"_id": result.inserted_id})

    demo_official_email = "official@fundingwise.local"
    if not await db.users.find_one({"email": demo_official_email}):
        await db.users.insert_one(
            {
                "email": demo_official_email,
                "name": "Demo Official",
                "role": "official",
                "organization_id": str(demo_org["_id"]),
                "hashed_password": hash_password("demo1234"),
                "created_at": __import__("datetime").datetime.utcnow(),
            }
        )

    print("Created or verified:")
    print(f"Admin org: Fundingwise Admin")
    print(f"Admin login: {settings.ADMIN_SEED_EMAIL} / {settings.ADMIN_SEED_PASSWORD}")
    print(f"Demo org: Demo Municipal Corporation")
    print("Demo official: official@fundingwise.local / demo1234")


if __name__ == "__main__":
    asyncio.run(main())
