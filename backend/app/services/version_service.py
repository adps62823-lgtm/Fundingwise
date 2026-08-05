from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from app.utils.serializers import serialize_doc


async def get_project_full_state(project_id: str, db) -> dict:
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    versions = await db.versions.find({"project_id": project_id}).sort("version_number", -1).to_list(length=100)
    assignments = await db.assignments.find({"project_id": project_id}).to_list(length=1000)
    dispatches = await db.dispatches.find({"project_id": project_id}).to_list(length=1000)
    assignments_by_task: dict[str, list[dict]] = {}
    for assignment in assignments:
        assignments_by_task.setdefault(str(assignment.get("task_index", 0)), []).append(serialize_doc(assignment))
    dispatches_by_task: dict[str, list[dict]] = {}
    for dispatch in dispatches:
        dispatches_by_task.setdefault(str(dispatch.get("task_index", 0)), []).append(serialize_doc(dispatch))
    return {
        "project": serialize_doc(project),
        "versions": [serialize_doc(version) for version in versions],
        "assignments": [serialize_doc(item) for item in assignments],
        "dispatches": [serialize_doc(item) for item in dispatches],
        "assignments_by_task": assignments_by_task,
        "dispatches_by_task": dispatches_by_task,
    }


async def get_public_version_history(project_id: str, db) -> list[dict]:
    versions = await db.versions.find({"project_id": project_id, "status": "published"}).sort("version_number", 1).to_list(length=200)
    return [serialize_doc(version) for version in versions]


async def publish_version(project_id: str, edited_fields: dict, notes: str | None, edited_by: str | None, db) -> dict:
    project_oid = ObjectId(project_id)
    current = await db.projects.find_one({"_id": project_oid})
    latest = await db.versions.find({"project_id": project_id}).sort("version_number", -1).to_list(length=1)
    version_number = (latest[0]["version_number"] if latest else 0) + 1
    version = {
        "project_id": project_id,
        "version_number": version_number,
        "status": "published",
        "total_estimate_inr": edited_fields.get("total_estimate_inr", latest[0].get("total_estimate_inr") if latest else None),
        "duration_days": edited_fields.get("duration_days", latest[0].get("duration_days") if latest else None),
        "cost_breakdown": edited_fields.get("cost_breakdown", latest[0].get("cost_breakdown", []) if latest else []),
        "schedule": edited_fields.get("schedule", latest[0].get("schedule", []) if latest else []),
        "contractor_suggestions": edited_fields.get("contractor_suggestions", latest[0].get("contractor_suggestions", []) if latest else []),
        "assigned_contractor": edited_fields.get("assigned_contractor", latest[0].get("assigned_contractor") if latest else None),
        "labor_plan": edited_fields.get("labor_plan", latest[0].get("labor_plan", []) if latest else []),
        "inventory_plan": edited_fields.get("inventory_plan", latest[0].get("inventory_plan", []) if latest else []),
        "risk_notes": edited_fields.get("risk_notes", latest[0].get("risk_notes", []) if latest else []),
        "confidence": edited_fields.get("confidence", latest[0].get("confidence", 0.7) if latest else 0.7),
        "notes": notes,
        "edited_by": edited_by,
        "parent_version_id": str(latest[0]["_id"]) if latest else None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.versions.insert_one(version)
    await db.projects.update_one({"_id": project_oid}, {"$set": {"current_version_id": str(result.inserted_id), "updated_at": datetime.now(timezone.utc)}})
    version["id"] = str(result.inserted_id)
    return serialize_doc(version)
