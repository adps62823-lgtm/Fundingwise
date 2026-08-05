from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.database import get_db
from app.services.version_service import get_project_full_state
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.post("")
async def create_project(payload: dict, user=Depends(require_role("official")), db=Depends(get_db)):
    project_doc = {
        "org_id": user["organization_id"],
        "title": payload.get("title"),
        "description": payload.get("description"),
        "ward": payload.get("ward"),
        "city": payload.get("city"),
        "location": payload.get("location"),
        "category": payload.get("category"),
        "status": payload.get("status", "planned"),
        "current_version_id": None,
        "created_by": str(user["_id"]),
        "created_at": __import__("datetime").datetime.utcnow(),
        "updated_at": __import__("datetime").datetime.utcnow(),
    }
    result = await db.projects.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    return {"data": serialize_doc(project_doc), "error": None}


@router.get("")
async def list_org_projects(user=Depends(require_role("official")), db=Depends(get_db)):
    projects = await db.projects.find({"org_id": user["organization_id"]}).to_list(length=500)
    return {"data": [serialize_doc(project) for project in projects], "error": None}


@router.get("/{project_id}")
async def get_project(project_id: str, user=Depends(require_role("official")), db=Depends(get_db)):
    project = await db.projects.find_one({"_id": ObjectId(project_id), "org_id": user["organization_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"data": serialize_doc(project), "error": None}


@router.patch("/{project_id}")
async def patch_project(project_id: str, payload: dict, user=Depends(require_role("official")), db=Depends(get_db)):
    project = await db.projects.find_one({"_id": ObjectId(project_id), "org_id": user["organization_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": {k: v for k, v in payload.items() if v is not None}, "$currentDate": {"updated_at": True}})
    updated = await db.projects.find_one({"_id": ObjectId(project_id)})
    return {"data": serialize_doc(updated), "error": None}


@router.get("/{project_id}/full-state")
async def full_state(project_id: str, user=Depends(require_role("official")), db=Depends(get_db)):
    project = await db.projects.find_one({"_id": ObjectId(project_id), "org_id": user["organization_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    state = await get_project_full_state(project_id, db)
    return {"data": state, "error": None}
