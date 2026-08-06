import secrets
import string
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.organization import (
    DEFAULT_ACTIVE_SERVICES,
    DEFAULT_SERVICE_TIERS,
    MicroserviceName,
    OrganizationCreate,
    OrganizationOut,
    OrganizationStatus,
    SubscriptionTier,
)
from app.models.service_catalog import SERVICE_TIER_CATALOG
from app.models.user import UserInDB, UserRole
from app.services.b2b_service import (
    approve_org_signup,
    create_api_key_for_org,
    get_api_key_usage_stats,
    list_all_organizations,
    list_pending_orgs,
    list_org_api_keys,
    register_organization,
    suspend_org_subscription,
)

router = APIRouter(prefix="/subscriptions", tags=["B2B Subscriptions & Orgs"])


class OrgSignupRequest(BaseModel):
    org_name: str = Field(..., min_length=2)
    poc_name: str
    poc_email: EmailStr
    requested_tier: SubscriptionTier = SubscriptionTier.COMMUNITY
    use_case: Optional[str] = None


class APIKeyCreateRequest(BaseModel):
    org_id: str
    label: str = Field("Default B2B Key", min_length=1)
    allowed_domains: List[str] = Field(default_factory=list)
    rate_limit_per_min: int = Field(60, ge=10, le=1000)


class OrgUpdateRequest(BaseModel):
    name: Optional[str] = None
    poc_name: Optional[str] = None
    poc_email: Optional[EmailStr] = None
    subscription_tier: Optional[SubscriptionTier] = None
    subscription_status: Optional[OrganizationStatus] = None
    custom_limits: Optional[Dict[str, int]] = None


class ServiceToggleRequest(BaseModel):
    service: MicroserviceName
    enabled: bool


class EmployeeCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    role: UserRole = UserRole.OFFICIAL


class EmployeeUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None


def generate_master_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


ORG_EDITABLE_FIELDS = {
    "name",
    "poc_name",
    "poc_email",
    "subscription_tier",
    "subscription_status",
    "custom_limits",
}


@router.get("/tiers", response_model=List[Dict[str, Any]])
async def get_service_tiers():
    tiers_info = []
    for tier in SubscriptionTier:
        allowed_services = DEFAULT_SERVICE_TIERS.get(tier, [])
        details = SERVICE_TIER_CATALOG.get(tier, {})
        tiers_info.append({
            "tier": tier.value,
            "title": details.get("title", tier.value.capitalize()),
            "price_monthly": details.get("price_monthly", 0),
            "included_services": [s.value for s in allowed_services],
            "description": details.get("description", ""),
        })
    return tiers_info


@router.post("/org-signup", status_code=status.HTTP201_CREATED)
async def org_signup(payload: OrgSignupRequest):
    org_create = OrganizationCreate(
        name=payload.org_name,
        poc_name=payload.poc_name,
        poc_email=payload.poc_email,
        subscription_tier=payload.requested_tier,
    )
    result = await register_organization(org_create)
    return {
        "message": "Organization registration received. Awaiting admin approval.",
        "org_id": str(result.inserted_id),
        "status": OrganizationStatus.PENDING.value,
    }


@router.get("/orgs/pending", response_model=List[OrganizationOut])
async def get_pending_orgs(admin: UserInDB = Depends(require_roles(UserRole.ADMIN))):
    orgs = await list_pending_orgs()
    return orgs


@router.get("/orgs", response_model=List[OrganizationOut])
async def get_all_orgs(admin: UserInDB = Depends(require_roles(UserRole.ADMIN))):
    orgs = await list_all_organizations()
    return orgs


@router.post("/orgs/{org_id}/approve", response_model=OrganizationOut)
async def approve_org(org_id: str, admin: UserInDB = Depends(require_roles(UserRole.ADMIN))):
    try:
        org = await approve_org_signup(org_id)
        return org
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/orgs/{org_id}/suspend", response_model=OrganizationOut)
async def suspend_org(org_id: str, admin: UserInDB = Depends(require_roles(UserRole.ADMIN))):
    try:
        org = await suspend_org_subscription(org_id)
        return org
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/orgs/{org_id}", response_model=OrganizationOut)
async def get_org_detail(org_id: str, admin: UserInDB = Depends(require_roles(UserRole.ADMIN))):
    db = get_db()
    org = await db.organizations.find_one({"_id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org["id"] = str(org.pop("_id"))
    return OrganizationOut(**org)


@router.patch("/orgs/{org_id}", response_model=OrganizationOut)
async def update_org_profile(
    org_id: str,
    payload: OrgUpdateRequest,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    updates = {k: v for k, v in payload.dict(exclude_unset=True).items() if k in ORG_EDITABLE_FIELDS and v is not None}
    
    if "subscription_tier" in updates and isinstance(updates["subscription_tier"], SubscriptionTier):
        updates["subscription_tier"] = updates["subscription_tier"].value

    if "subscription_status" in updates and isinstance(updates["subscription_status"], OrganizationStatus):
        updates["subscription_status"] = updates["subscription_status"].value

    if not updates:
        raise HTTPException(status_code=400, detail="No valid update fields provided")

    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.organizations.find_one_and_update(
        {"_id": org_id},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Organization not found")
    res["id"] = str(res.pop("_id"))
    return OrganizationOut(**res)


@router.delete("/orgs/{org_id}")
async def delete_org(
    org_id: str,
    hard: bool = Query(False),
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    if hard:
        res = await db.organizations.delete_one({"_id": org_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Organization not found")
        return {"message": f"Organization {org_id} permanently deleted"}
    
    res = await db.organizations.find_one_and_update(
        {"_id": org_id},
        {"$set": {"subscription_status": OrganizationStatus.DELETED.value, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"message": f"Organization {org_id} marked as deleted/suspended"}


@router.patch("/orgs/{org_id}/services")
async def toggle_org_service(
    org_id: str,
    payload: ServiceToggleRequest,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    org = await db.organizations.find_one({"_id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    active_services = set(org.get("active_services", DEFAULT_ACTIVE_SERVICES))
    svc_val = payload.service.value if hasattr(payload.service, "value") else str(payload.service)

    if payload.enabled:
        active_services.add(svc_val)
    else:
        active_services.discard(svc_val)

    res = await db.organizations.find_one_and_update(
        {"_id": org_id},
        {"$set": {"active_services": list(active_services), "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    res["id"] = str(res.pop("_id"))
    return OrganizationOut(**res)


@router.get("/orgs/{org_id}/employees")
async def list_org_employees(
    org_id: str,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    org = await db.organizations.find_one({"_id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    users = await db.users.find({"org_id": org_id}).to_list(length=200)
    out = []
    for u in users:
        u_id = str(u["_id"])
        out.append({
            "id": u_id,
            "email": u.get("email"),
            "full_name": u.get("full_name"),
            "role": u.get("role"),
            "has_master_password": bool(u.get("master_password")),
            "master_password": u.get("master_password"),
            "created_at": u.get("created_at"),
        })
    return out


@router.post("/orgs/{org_id}/employees")
async def create_org_employee(
    org_id: str,
    payload: EmployeeCreateRequest,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    org = await db.organizations.find_one({"_id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User email already registered")

    master_pwd = generate_master_password()
    user_doc = {
        "email": payload.email.lower(),
        "full_name": payload.full_name,
        "role": payload.role.value if hasattr(payload.role, "value") else str(payload.role),
        "org_id": org_id,
        "master_password": master_pwd,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    res = await db.users.insert_one(user_doc)
    return {
        "id": str(res.inserted_id),
        "email": payload.email.lower(),
        "full_name": payload.full_name,
        "role": user_doc["role"],
        "org_id": org_id,
        "master_password": master_pwd,
        "message": "Employee account created with auto-generated master password.",
    }


@router.post("/orgs/{org_id}/employees/{user_id}/reset-password")
async def reset_employee_master_password(
    org_id: str,
    user_id: str,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    user = await db.users.find_one({"_id": user_id, "org_id": org_id})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found in organization")

    new_master_pwd = generate_master_password()
    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"master_password": new_master_pwd, "updated_at": datetime.now(timezone.utc)}},
    )
    return {
        "user_id": user_id,
        "email": user.get("email"),
        "new_master_password": new_master_pwd,
        "message": "Master password reset successfully.",
    }


@router.patch("/orgs/{org_id}/employees/{user_id}")
async def update_org_employee(
    org_id: str,
    user_id: str,
    payload: EmployeeUpdateRequest,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    updates = {}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name
    if payload.role is not None:
        updates["role"] = payload.role.value if hasattr(payload.role, "value") else str(payload.role)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.users.find_one_and_update(
        {"_id": user_id, "org_id": org_id},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {
        "id": str(res["_id"]),
        "full_name": res.get("full_name"),
        "email": res.get("email"),
        "role": res.get("role"),
    }


@router.delete("/orgs/{org_id}/employees/{user_id}")
async def delete_org_employee(
    org_id: str,
    user_id: str,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    db = get_db()
    res = await db.users.delete_one({"_id": user_id, "org_id": org_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": f"Employee {user_id} removed from organization"}


@router.post("/api-keys")
async def generate_api_key(
    payload: APIKeyCreateRequest,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    try:
        res = await create_api_key_for_org(
            org_id=payload.org_id,
            label=payload.label,
            allowed_domains=payload.allowed_domains,
            rate_limit_per_min=payload.rate_limit_per_min,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api-keys")
async def get_all_api_keys(
    org_id: Optional[str] = None,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    keys = await list_org_api_keys(org_id=org_id)
    return keys


@router.get("/api-keys/{key_id}/usage")
async def get_key_usage(
    key_id: str,
    admin: UserInDB = Depends(require_roles(UserRole.ADMIN)),
):
    usage = await get_api_key_usage_stats(key_id)
    return usage