from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_api_key
from app.database import get_db
from app.services.civic_score_service import compute_civic_score
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/b2b", tags=["b2b"])


@router.get("/civic-scores")
async def civic_scores(city: str | None = None, ward: str | None = None, api_key=Depends(require_api_key), db=Depends(get_db)):
    query = {}
    if city:
        query["city"] = city
    if ward:
        query["ward"] = ward
    projects = await db.projects.find(query).to_list(length=1000)
    results = []
    for project in projects:
        results.append((await compute_civic_score("project", str(project["_id"]), db)).model_dump(mode="json"))
    return {"data": results, "error": None}


@router.get("/projects")
async def projects(city: str | None = None, status: str | None = None, api_key=Depends(require_api_key), db=Depends(get_db)):
    query = {}
    if city:
        query["city"] = city
    if status:
        query["status"] = status
    items = []
    for project in await db.projects.find(query).to_list(length=1000):
        versions_count = await db.versions.count_documents({"project_id": str(project["_id"]), "status": "published"})
        score = await compute_civic_score("project", str(project["_id"]), db)
        items.append({
            "id": str(project["_id"]),
            "title": project["title"],
            "ward": project["ward"],
            "category": project["category"],
            "status": project["status"],
            "current_civic_score": score.model_dump(mode="json"),
            "published_version_count": versions_count,
        })
    return {"data": items, "error": None}
