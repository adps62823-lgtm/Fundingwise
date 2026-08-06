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
        # NOTE: `hashed_password` is written here for backward compatibility with the
        # original JWT-based auth design, but it is NOT checked anywhere anymore.
        # All real authentication now goes through Firebase (see app/auth/dependencies.py).
        # This Mongo document only exists to PRE-AUTHORIZE the admin role for this email —
        # see the "First-time admin login" section in README.md for how to actually sign in.
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
    print("Admin org: Fundingwise Admin")
    print("")
    print("Admin login is NOT ready yet from this script alone - it only pre-authorizes")
    print(f"the role for {settings.ADMIN_SEED_EMAIL} in MongoDB. Now run:")
    print("")
    print("    python bootstrap_admin.py")
    print("")
    print("That creates the actual Firebase account server-side (Admin SDK), so you can")
    print(f"log in directly at /login with {settings.ADMIN_SEED_EMAIL} and the password")
    print("from ADMIN_SEED_PASSWORD in .env - no public registration step, ever.")
    print("")
    print(f"Demo org: Demo Municipal Corporation (id: {demo_org['_id']})")
    print("Demo official is a normal self-service account, unlike admin:")
    print("  go to /register, choose 'Official', use official@fundingwise.local,")
    print(f"  any password, and organization ID: {demo_org['_id']}")


if __name__ == "__main__":
    asyncio.run(main())
