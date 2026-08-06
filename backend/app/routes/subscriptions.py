from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.database import get_db
from app.models.service_catalog import SERVICE_CATALOG, normalize_services
from app.models.subscription import ApiKey, SubscriptionTier
from app.services.firebase_auth import get_or_create_firebase_user
from app.utils.security import generate_api_key, generate_temp_password, hash_password
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])

ORG_EDITABLE_FIELDS = {"name", "city", "state", "poc_name", "contact_email", "contact_phone", "subscription_tier"}


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


def _valid_org_id(org_id: str) -> ObjectId:
    try:
        return ObjectId(org_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid organization id") from exc


def _public_employee(doc: dict) -> dict:
    """Serialize a user doc for the admin panel, stripping the audit-only
    password hash - it's never useful to the frontend and there's no reason
    to ship even a hash over the wire if it doesn't have to be."""
    data = serialize_doc(doc)
    data.pop("password_hash_audit", None)
    return data


@router.get("/orgs/{org_id}")
async def get_org_detail(org_id: str, user=Depends(require_role("admin")), db=Depends(get_db)):
    """Full admin drill-down for one org: profile/POC, subscription, live
    per-microservice toggle state, employee count, and what that org is
    actually using (projects, workers, inventory items, API calls)."""
    org = await db.organizations.find_one({"_id": _valid_org_id(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    employees = await db.users.find({"organization_id": org_id}).sort("created_at", -1).to_list(length=1000)

    projects_count = await db.projects.count_documents({"org_id": org_id})
    workers_count = await db.workers.count_documents({"org_id": org_id})
    inventory_count = await db.inventory_items.count_documents({"org_id": org_id})
    api_keys = await db.api_keys.find({"org_id": org_id}).to_list(length=100)
    api_calls_total = 0
    for key in api_keys:
        api_calls_total += await db.api_usage_logs.count_documents({"api_key_id": str(key["_id"])})

    services_state = normalize_services(org.get("services"))
    catalog_with_state = {
        key: {**meta, "enabled": services_state.get(key, True)}
        for key, meta in SERVICE_CATALOG.items()
    }

    return {
        "data": {
            "organization": serialize_doc(org),
            "services": catalog_with_state,
            "employees": [_public_employee(e) for e in employees],
            "usage": {
                "employee_count": len(employees),
                "projects": projects_count,
                "workers": workers_count,
                "inventory_items": inventory_count,
                "api_keys": len(api_keys),
                "api_calls_total": api_calls_total,
            },
        },
        "error": None,
    }


@router.patch("/orgs/{org_id}")
async def update_org(org_id: str, payload: dict, user=Depends(require_role("admin")), db=Depends(get_db)):
    """Edit org profile / POC contact / subscription tier. Does not touch
    subscription_status or services - use the dedicated approve/suspend and
    services endpoints for those so each action stays auditable and explicit."""
    org = await db.organizations.find_one({"_id": _valid_org_id(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    updates = {k: v for k, v in payload.items() if k in ORG_EDITABLE_FIELDS and v is not None}
    if "subscription_tier" in updates and updates["subscription_tier"] not in SubscriptionTier:
        raise HTTPException(status_code=400, detail="Unknown subscription tier")
    if not updates:
        raise HTTPException(status_code=400, detail="No editable fields provided")

    await db.organizations.update_one({"_id": org["_id"]}, {"$set": updates})
    updated = await db.organizations.find_one({"_id": org["_id"]})
    return {"data": serialize_doc(updated), "error": None}


@router.delete("/orgs/{org_id}")
async def delete_org(org_id: str, hard: bool = False, user=Depends(require_role("admin")), db=Depends(get_db)):
    """Remove an org. By default this is a SOFT delete - matching the rest of
    the product's "nothing quietly disappears" philosophy: the org, its
    projects, and their transparency history all stay intact and viewable,
    but subscription_status flips to "deleted", every microservice is
    switched off, and every employee account is deactivated so nobody can
    log in as that org anymore.

    Pass ?hard=true to actually delete the org document, but only if it has
    no employees and no projects left (detach/reassign or soft-delete those
    first) - this guards against silently orphaning data that other
    collections reference by org_id."""
    org = await db.organizations.find_one({"_id": _valid_org_id(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if hard:
        employees_count = await db.users.count_documents({"organization_id": org_id})
        projects_count = await db.projects.count_documents({"org_id": org_id})
        if employees_count or projects_count:
            raise HTTPException(
                status_code=409,
                detail="Cannot hard-delete an organization with existing employees or projects. Remove/reassign them first, or omit ?hard=true to soft-delete instead.",
            )
        await db.organizations.delete_one({"_id": org["_id"]})
        return {"data": {"id": org_id, "deleted": True, "hard": True}, "error": None}

    await db.organizations.update_one(
        {"_id": org["_id"]},
        {"$set": {"subscription_status": "deleted", "services": {key: False for key in SERVICE_CATALOG}}},
    )
    await db.users.update_many({"organization_id": org_id}, {"$set": {"active": False}})
    return {"data": {"id": org_id, "deleted": True, "hard": False}, "error": None}


@router.patch("/orgs/{org_id}/services")
async def toggle_org_service(org_id: str, payload: dict, user=Depends(require_role("admin")), db=Depends(get_db)):
    """Activate or suspend a single microservice for this org, independent of
    subscription_status. Body: {"service": "ai_planning", "enabled": false}"""
    service_key = payload.get("service")
    enabled = payload.get("enabled")
    if service_key not in SERVICE_CATALOG:
        raise HTTPException(status_code=400, detail=f"Unknown service '{service_key}'. Valid keys: {list(SERVICE_CATALOG)}")
    if not isinstance(enabled, bool):
        raise HTTPException(status_code=400, detail="'enabled' must be true or false")

    org = await db.organizations.find_one({"_id": _valid_org_id(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    current = normalize_services(org.get("services"))
    current[service_key] = enabled
    await db.organizations.update_one({"_id": org["_id"]}, {"$set": {"services": current}})
    return {"data": {"services": current}, "error": None}


@router.get("/orgs/{org_id}/employees")
async def list_org_employees(org_id: str, user=Depends(require_role("admin")), db=Depends(get_db)):
    employees = await db.users.find({"organization_id": org_id}).sort("created_at", -1).to_list(length=1000)
    return {"data": [_public_employee(e) for e in employees], "error": None}


@router.post("/orgs/{org_id}/employees")
async def create_org_employee(org_id: str, payload: dict, user=Depends(require_role("admin")), db=Depends(get_db)):
    """Admin-created employee account. Generates a unique, auto-generated
    password for the employee, sets it as their real Firebase Auth password
    server-side, and returns it ONCE in this response so the admin can hand
    it to the employee - they can log in with it directly, or the admin can
    issue a fresh one later via the reset-password endpoint below if they
    forget it. The plaintext is never stored; only a bcrypt hash is kept for
    audit/verification purposes."""
    org = await db.organizations.find_one({"_id": _valid_org_id(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    email = (payload.get("email") or "").strip().lower()
    name = (payload.get("name") or "").strip()
    if not email or not name:
        raise HTTPException(status_code=400, detail="name and email are required")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    temp_password = generate_temp_password()
    firebase_user = get_or_create_firebase_user(email, temp_password)

    now = datetime.now(timezone.utc)
    user_doc = {
        "firebase_uid": firebase_user.uid,
        "email": email,
        "name": name,
        "role": "official",
        "organization_id": org_id,
        "active": True,
        "photo_url": None,
        "email_verified": True,
        "password_hash_audit": hash_password(temp_password),
        "password_last_reset_at": now,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    return {
        "data": {
            "employee": _public_employee(user_doc),
            "generated_password": temp_password,
        },
        "error": None,
    }


@router.post("/orgs/{org_id}/employees/{user_id}/reset-password")
async def reset_employee_password(org_id: str, user_id: str, user=Depends(require_role("admin")), db=Depends(get_db)):
    """Generate a brand-new master/recovery password for an employee who
    forgot theirs, set it as their live Firebase password, and return it
    ONCE for the admin to relay. This rotates the credential rather than
    revealing any password stored earlier - Fundingwise never keeps a
    recoverable copy of a plaintext password."""
    employee = await db.users.find_one({"_id": ObjectId(user_id), "organization_id": org_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found in this organization")

    temp_password = generate_temp_password()
    get_or_create_firebase_user(employee["email"], temp_password)

    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": employee["_id"]},
        {"$set": {"password_hash_audit": hash_password(temp_password), "password_last_reset_at": now, "updated_at": now}},
    )
    return {"data": {"employee_id": user_id, "generated_password": temp_password}, "error": None}


@router.patch("/orgs/{org_id}/employees/{user_id}")
async def update_org_employee(org_id: str, user_id: str, payload: dict, user=Depends(require_role("admin")), db=Depends(get_db)):
    """Update an employee's name, or activate/suspend their account (a
    suspended employee's token is rejected on their next request - see
    get_current_user in app/auth/dependencies.py - without deleting them or
    touching the rest of the org)."""
    employee = await db.users.find_one({"_id": ObjectId(user_id), "organization_id": org_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found in this organization")

    updates = {}
    if "name" in payload and payload["name"]:
        updates["name"] = payload["name"]
    if "active" in payload and isinstance(payload["active"], bool):
        updates["active"] = payload["active"]
    if not updates:
        raise HTTPException(status_code=400, detail="No editable fields provided")
    updates["updated_at"] = datetime.now(timezone.utc)

    await db.users.update_one({"_id": employee["_id"]}, {"$set": updates})
    updated = await db.users.find_one({"_id": employee["_id"]})
    return {"data": _public_employee(updated), "error": None}


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
