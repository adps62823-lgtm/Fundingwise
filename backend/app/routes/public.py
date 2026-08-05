from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.models.civic_score import CivicScoreResult
from app.services.civic_score_service import compute_civic_score
from app.utils.geo import haversine_km
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/public", tags=["public"])


@router.get("/projects")
async def list_projects(city: str | None = None, ward: str | None = None, category: str | None = None, status: str | None = None, db=Depends(get_db)):
    query = {}
    if city:
        query["city"] = city
    if ward:
        query["ward"] = ward
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    projects = await db.projects.find(query).to_list(length=500)
    items = []
    for project in projects:
        score = await compute_civic_score("project", str(project["_id"]), db)
        items.append({
            "id": str(project["_id"]),
            "title": project["title"],
            "ward": project["ward"],
            "category": project["category"],
            "status": project["status"],
            "location": project["location"],
            "current_civic_score": score.model_dump(mode="json"),
        })
    return {"data": items, "error": None}


@router.get("/projects/{project_id}")
async def get_project(project_id: str, db=Depends(get_db)):
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    reports = await db.reports.find({"project_id": project_id}).sort("created_at", -1).to_list(length=5)
    score = await compute_civic_score("project", project_id, db)
    return {"data": {"project": serialize_doc(project), "reports": [serialize_doc(report) for report in reports], "civic_score": score.model_dump(mode="json")}, "error": None}


@router.post("/reports")
async def submit_report(payload: dict, user=Depends(get_current_user_optional), db=Depends(get_db)):
    project_id = payload.get("project_id")
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user is None:
        report_location = payload.get("location", {})
        coords = report_location.get("coordinates", [0, 0])
        project_coords = project["location"].get("coordinates", [0, 0])
        distance = haversine_km(coords[1], coords[0], project_coords[1], project_coords[0])
        if distance > 2:
            raise HTTPException(status_code=400, detail="Anonymous reports must be near the project location")
    report_doc = {
        "project_id": project_id,
        "submitted_by": str(user["_id"]) if user else None,
        "photo_url": payload.get("photo_url", ""),
        "location": payload.get("location"),
        "note": payload.get("note"),
        "report_type": payload.get("report_type"),
        "verification_count_up": 0,
        "verification_count_down": 0,
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    result = await db.reports.insert_one(report_doc)
    report_doc["_id"] = result.inserted_id
    return {"data": serialize_doc(report_doc), "error": None}


@router.post("/reports/{report_id}/vote")
async def vote_report(report_id: str, payload: dict, user=Depends(get_current_user), db=Depends(get_db)):
    direction = payload.get("direction")
    if direction not in {"up", "down"}:
        raise HTTPException(status_code=400, detail="Invalid vote direction")
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.votes.update_one(
        {"report_id": report_id, "user_id": str(user["_id"])},
        {"$set": {"direction": direction, "updated_at": __import__("datetime").datetime.utcnow()}},
        upsert=True,
    )
    up_votes = await db.votes.count_documents({"report_id": report_id, "direction": "up"})
    down_votes = await db.votes.count_documents({"report_id": report_id, "direction": "down"})
    await db.reports.update_one({"_id": ObjectId(report_id)}, {"$set": {"verification_count_up": up_votes, "verification_count_down": down_votes}})
    return {"data": {"verification_count_up": up_votes, "verification_count_down": down_votes}, "error": None}


@router.get("/civic-score/{entity_type}/{entity_id}")
async def civic_score(entity_type: str, entity_id: str, db=Depends(get_db)):
    return {"data": (await compute_civic_score(entity_type, entity_id, db)).model_dump(mode="json"), "error": None}
