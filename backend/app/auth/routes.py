from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_identity, get_current_user
from app.database import get_db
from app.config import settings
from app.models.user import UserProfileUpsert, UserPublic
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _identity_name(identity: dict, fallback_email: str) -> str:
    display_name = identity.get("name") or identity.get("firebase", {}).get("sign_in_provider")
    if display_name and display_name != "password":
        return display_name
    return fallback_email.split("@", 1)[0].replace(".", " ").replace("_", " ").title() or "Fundingwise User"


async def _sync_user(payload: UserProfileUpsert | None, identity: dict, db):
    email = (identity.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase user email is missing")

    firebase_uid = identity.get("uid")
    existing = None
    if firebase_uid:
        existing = await db.users.find_one({"firebase_uid": firebase_uid})
    if not existing:
        existing = await db.users.find_one({"email": email})

    now = datetime.now(timezone.utc)
    incoming_name = (payload.name if payload and payload.name else None) or identity.get("name") or identity.get("email")
    name = existing.get("name") if existing and existing.get("name") else _identity_name(identity, email)
    if incoming_name:
        name = incoming_name

    if existing:
        updates = {
            "firebase_uid": firebase_uid,
            "email": email,
            "name": name,
            "photo_url": identity.get("picture") or existing.get("photo_url"),
            "email_verified": bool(identity.get("email_verified", existing.get("email_verified", False))),
            "updated_at": now,
        }
        if existing.get("organization_id") is None and payload and payload.organization_id:
            updates["organization_id"] = payload.organization_id
        if existing.get("role") != "admin" and payload and payload.role == "admin":
            if email != settings.ADMIN_SEED_EMAIL:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role is reserved")
            updates["role"] = "admin"
        elif existing.get("role") != "admin" and payload and payload.role in {"citizen", "official"}:
            if existing.get("role") is None:
                updates["role"] = payload.role
        if (payload and payload.role == "official") or existing.get("role") == "official":
            org_id = updates.get("organization_id") or existing.get("organization_id") or (payload.organization_id if payload else None)
            if not org_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="organization_id is required for official users")
            try:
                org = await db.organizations.find_one({"_id": ObjectId(org_id)})
            except Exception as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid organization_id") from exc
            if not org or org.get("subscription_status") not in {"active", "trial"}:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your organization is not yet approved")
            updates["organization_id"] = org_id
            updates["role"] = "official"
        await db.users.update_one({"_id": existing["_id"]}, {"$set": updates})
        user_doc = await db.users.find_one({"_id": existing["_id"]})
        return user_doc

    role = (payload.role if payload and payload.role else "citizen")
    if role == "admin" and email != settings.ADMIN_SEED_EMAIL:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role is reserved")
    organization_id = payload.organization_id if payload else None
    if role == "official":
        if not organization_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="organization_id is required for official users")
        try:
            org = await db.organizations.find_one({"_id": ObjectId(organization_id)})
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid organization_id") from exc
        if not org or org.get("subscription_status") not in {"active", "trial"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your organization is not yet approved")

    user_doc = {
        "firebase_uid": firebase_uid,
        "email": email,
        "name": name,
        "role": role,
        "organization_id": organization_id,
        "photo_url": identity.get("picture"),
        "email_verified": bool(identity.get("email_verified", False)),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return user_doc


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {"data": {"user": UserPublic.from_doc(user).model_dump(mode="json")}, "error": None}


@router.post("/sync")
async def sync_user(payload: UserProfileUpsert | None = None, identity=Depends(get_current_identity), db=Depends(get_db)):
    user = await _sync_user(payload, identity, db)
    return {"data": {"user": UserPublic.from_doc(user).model_dump(mode="json")}, "error": None}


@router.post("/register")
async def register(payload: UserProfileUpsert | None = None, identity=Depends(get_current_identity), db=Depends(get_db)):
    user = await _sync_user(payload, identity, db)
    return {"data": {"user": UserPublic.from_doc(user).model_dump(mode="json")}, "error": None}


@router.post("/login")
async def login(payload: UserProfileUpsert | None = None, identity=Depends(get_current_identity), db=Depends(get_db)):
    user = await _sync_user(payload, identity, db)
    return {"data": {"user": UserPublic.from_doc(user).model_dump(mode="json")}, "error": None}
