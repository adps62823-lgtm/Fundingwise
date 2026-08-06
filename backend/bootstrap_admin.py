from __future__ import annotations

import asyncio

from app.config import settings
from app.database import get_db
from app.services.firebase_auth import get_or_create_firebase_user


async def main():
    if not settings.ADMIN_SEED_EMAIL or not settings.ADMIN_SEED_PASSWORD:
        print("Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in backend/.env first, then rerun this.")
        return

    db = get_db()

    # 1. Make sure the admin org + the pre-authorized Mongo user record exist
    #    (same records seed_data.py creates - safe to run this alone too).
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

    admin_email = settings.ADMIN_SEED_EMAIL.lower()
    admin_user = await db.users.find_one({"email": admin_email})
    if not admin_user:
        await db.users.insert_one(
            {
                "email": admin_email,
                "name": "Fundingwise Admin",
                "role": "admin",
                "organization_id": str(admin_org["_id"]),
                "created_at": __import__("datetime").datetime.utcnow(),
            }
        )

    # 2. Create (or reset) the actual Firebase account, server-side, using the
    #    Admin SDK - this is the step that was missing. After this, the email
    #    and password already sitting in your .env work directly at /login.
    firebase_user = get_or_create_firebase_user(admin_email, settings.ADMIN_SEED_PASSWORD)

    # 3. Link the two records together so /auth/me resolves instantly on first login.
    await db.users.update_one(
        {"email": admin_email},
        {"$set": {"firebase_uid": firebase_user.uid, "email_verified": True}},
    )

    print("Admin account ready.")
    print(f"  Email:    {settings.ADMIN_SEED_EMAIL}")
    print(f"  Password: (whatever ADMIN_SEED_PASSWORD is set to in backend/.env)")
    print("Log in normally at /login - no registration step needed.")
    print("")
    print("Re-running this script later (e.g. after changing ADMIN_SEED_PASSWORD)")
    print("will reset the Firebase password to match .env again.")


if __name__ == "__main__":
    asyncio.run(main())
