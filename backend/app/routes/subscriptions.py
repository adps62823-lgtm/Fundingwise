from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.database import get_db
from app.models.subscription import ApiKey, SubscriptionTier
from app.utils.security import generate_api_key
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


@router.get("/tiers")
async def get_tiers():
    # Single source of truth for pricing - the frontend Pricing page should read
    # from this instead of hardcoding tier names, so the two can never drift apart.
    return {"data": SubscriptionTier, "error": None}


@router.post("/org-signup")
async def org_signup(payload: dict, db=Depends(get_db)):
    slug = re.sub(r"[^a-z0-9]+", "-", payload["name"].lower()).strip("-")
    requested_tier = payload.get("requested_tier", "trial")
    if requested_tier not in SubscriptionTier:
        requested_tier = "trial"  # unknown/mismatched tier slug falls back safely instead of corrupting data
    doc = {
        "name": payload["name"],
        "slug": slug,
        "type": payload["type"],
        "city": payload["city"],
        "state": payload["state"],
        "contact_email": payload.get("contact_email"),
        "contact_phone": payload.get("contact_phone"),
        "subscription_tier": requested_tier,
        "subscription_status": "pending",
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    result = await db.organizations.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"data": serialize_doc(doc), "error": None}


@router.get("/orgs/pending")
async def pending_orgs(user=Depends(require_role("admin")), db=Depends(get_db)):
    orgs = await db.organizations.find({"subscription_status": "pending"}).to_list(length=500)
    return {"data": [serialize_doc(org) for org in orgs], "error": None}


@router.get("/orgs")
async def list_orgs(user=Depends(require_role("admin")), db=Depends(get_db)):
    orgs = await db.organizations.find({}).sort("created_at", -1).to_list(length=500)
    return {"data": [serialize_doc(org) for org in orgs], "error": None}


@router.post("/orgs/{org_id}/approve")
async def approve_org(org_id: str, user=Depends(require_role("admin")), db=Depends(get_db)):
    await db.organizations.update_one({"_id": ObjectId(org_id)}, {"$set": {"subscription_status": "active"}})
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    return {"data": serialize_doc(org), "error": None}


@router.post("/orgs/{org_id}/suspend")
async def suspend_org(org_id: str, user=Depends(require_role("admin")), db=Depends(get_db)):
    await db.organizations.update_one({"_id": ObjectId(org_id)}, {"$set": {"subscription_status": "suspended"}})
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    return {"data": serialize_doc(org), "error": None}


@router.post("/api-keys")
async def create_api_key(payload: dict, user=Depends(require_role("admin")), db=Depends(get_db)):
    key_doc = {
        "org_id": payload.get("org_id"),
        "client_name": payload.get("client_name"),
        "key": generate_api_key(),
        "label": payload["label"],
        "active": True,
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    result = await db.api_keys.insert_one(key_doc)
    key_doc["_id"] = result.inserted_id
    return {"data": serialize_doc(key_doc), "error": None}


@router.get("/api-keys")
async def list_api_keys(user=Depends(require_role("admin")), db=Depends(get_db)):
    keys = await db.api_keys.find({}).sort("created_at", -1).to_list(length=500)
    payload = []
    for key in keys:
        key_id = str(key["_id"])
        total_calls = await db.api_usage_logs.count_documents({"api_key_id": key_id})
        payload.append({
            **serialize_doc(key),
            "total_calls": total_calls,
        })
    return {"data": payload, "error": None}


@router.get("/api-keys/{key_id}/usage")
async def api_key_usage(key_id: str, user=Depends(require_role("admin")), db=Depends(get_db)):
    logs = await db.api_usage_logs.find({"api_key_id": key_id}).to_list(length=1000)
    grouped = {}
    window_start = datetime.now(timezone.utc) - timedelta(days=30)
    for log in logs:
        called_at = log["called_at"]
        if called_at < window_start:
            continue
        day = called_at.date().isoformat()
        grouped[day] = grouped.get(day, 0) + 1
    return {"data": {"key_id": key_id, "daily_usage": grouped, "total_calls": sum(grouped.values())}, "error": None}
