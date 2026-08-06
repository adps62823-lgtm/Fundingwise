from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_service
from app.database import get_db
from app.services.ai_service import generate_cost_and_timeline
from app.services.version_service import publish_version
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/ai-planning", tags=["ai-planning"])


@router.post("/projects/{project_id}/draft")
async def generate_ai_draft(project_id: str, payload: dict, user=Depends(require_service("ai_planning")), db=Depends(get_db)):
    project = await db.projects.find_one({"_id": ObjectId(project_id), "org_id": user["organization_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    draft = await generate_cost_and_timeline(payload.get("synopsis", project["description"]), project["category"], project["city"])
    version_doc = {
        "project_id": project_id,
        "version_number": (await db.versions.count_documents({"project_id": project_id})) + 1,
        "status": "ai_draft",
        "total_estimate_inr": draft.get("total_estimate_inr"),
        "duration_days": draft.get("duration_days"),
        "cost_breakdown": draft.get("cost_breakdown", []),
        "schedule": draft.get("schedule", []),
        "contractor_suggestions": draft.get("contractor_suggestions", []),
        "assigned_contractor": None,
        "labor_plan": [],
        "inventory_plan": [],
        "risk_notes": draft.get("risk_notes", []),
        "confidence": draft.get("confidence", 0.7),
        "notes": "AI Draft",
        "edited_by": None,
        "parent_version_id": None,
        "created_at": __import__("datetime").datetime.utcnow(),
        "updated_at": __import__("datetime").datetime.utcnow(),
    }
    result = await db.versions.insert_one(version_doc)
    await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": {"current_version_id": str(result.inserted_id), "status": "in_progress"}})
    version_doc["_id"] = result.inserted_id
    return {"data": serialize_doc(version_doc), "error": None}


@router.post("/projects/{project_id}/publish")
async def publish(project_id: str, payload: dict, user=Depends(require_service("ai_planning")), db=Depends(get_db)):
    version = await publish_version(project_id, payload.get("edited_fields", {}), payload.get("notes"), str(user["_id"]), db)
    return {"data": version, "error": None}
