from __future__ import annotations

from typing import Callable

from bson import ObjectId
from fastapi import Depends, Header, HTTPException, status

from app.database import get_db
from app.models.service_catalog import normalize_services
from app.models.subscription import SubscriptionTier
from app.services.firebase_auth import verify_firebase_token


async def get_current_identity(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return verify_firebase_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(authorization: str = Header(default=""), db=Depends(get_db)):
    identity = await get_current_identity(authorization=authorization)
    firebase_uid = identity.get("uid")
    email = (identity.get("email") or "").lower()
    user = None
    if firebase_uid:
        user = await db.users.find_one({"firebase_uid": firebase_uid})
    if not user and email:
        user = await db.users.find_one({"email": email})
        if user and firebase_uid and not user.get("firebase_uid"):
            await db.users.update_one({"_id": user["_id"]}, {"$set": {"firebase_uid": firebase_uid, "email_verified": bool(identity.get("email_verified", False))}})
            user = await db.users.find_one({"_id": user["_id"]})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Profile not linked")
    if user.get("active", True) is False:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This account has been suspended by an administrator")
    return user


async def get_current_user_optional(authorization: str = Header(default=""), db=Depends(get_db)):
    if not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None


def require_role(role: str) -> Callable:
    async def _dependency(user=Depends(get_current_user)):
        if user["role"] != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return _dependency


def require_service(service_key: str) -> Callable:
    """Gate a route behind a specific microservice being switched on for the
    current official's org. This is deliberately separate from
    subscription_status: an admin can suspend one microservice (e.g. AI
    Planning) while the org's subscription stays active and every other
    service keeps working, or vice versa."""

    async def _dependency(user=Depends(require_role("official")), db=Depends(get_db)):
        org = await db.organizations.find_one({"_id": ObjectId(user["organization_id"])}) if user.get("organization_id") else None
        if not org or org.get("subscription_status") not in {"active", "trial"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your organization's subscription is not active")
        services = normalize_services(org.get("services"))
        if not services.get(service_key, True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The '{service_key}' service has been suspended for your organization by an administrator",
            )
        return user

    return _dependency


async def require_api_key(x_api_key: str = Header(...), db=Depends(get_db)):
    api_key = await db.api_keys.find_one({"key": x_api_key, "active": True})
    if not api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    usage_count = await db.api_usage_logs.count_documents({"api_key_id": str(api_key["_id"])})
    tier_name = "trial"
    if api_key.get("org_id"):
        org = await db.organizations.find_one({"_id": ObjectId(api_key["org_id"])})
        if org:
            tier_name = org.get("subscription_tier", "trial")
            if org.get("subscription_status") == "suspended":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This organization's subscription is suspended")
            if not normalize_services(org.get("services")).get("b2b_api", True):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="B2B API access has been suspended for this organization by an administrator")
    soft_cap = SubscriptionTier.get(tier_name, SubscriptionTier["trial"])["api_calls_included"]
    await db.api_usage_logs.insert_one({"api_key_id": str(api_key["_id"]), "endpoint": "b2b", "called_at": __import__("datetime").datetime.utcnow()})
    if usage_count > soft_cap * 1.1:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="API soft limit exceeded for this tier")
    return api_key
