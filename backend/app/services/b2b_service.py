from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.civic_score_service import compute_civic_score


async def verify_b2b_api_key(db, api_key: str) -> dict[str, Any] | None:
    """Validate a B2B API key against the database."""
    key_doc = await db.api_keys.find_one({"key": api_key, "active": True})
    if not key_doc:
        return None
    return key_doc


async def log_b2b_api_usage(db, api_key_id: str, endpoint: str, status_code: int = 200) -> None:
    """Log B2B API calls for billing and usage tracking."""
    log_entry = {
        "api_key_id": api_key_id,
        "endpoint": endpoint,
        "status_code": status_code,
        "called_at": datetime.now(timezone.utc),
    }
    await db.api_usage_logs.insert_one(log_entry)


async def get_b2b_civic_scores(db, city: str | None = None, ward: str | None = None) -> list[dict[str, Any]]:
    """Compute civic scores for projects filtered by city and/or ward."""
    query: dict[str, Any] = {}
    if city:
        query["city"] = city
    if ward:
        query["ward"] = ward

    projects = await db.projects.find(query).to_list(length=1000)
    results = []
    for project in projects:
        score_res = await compute_civic_score("project", str(project["_id"]), db)
        results.append(score_res.model_dump(mode="json"))
    return results


async def get_b2b_projects(
    db, city: str | None = None, status: str | None = None
) -> list[dict[str, Any]]:
    """Retrieve B2B formatted list of projects with civic score metrics."""
    query: dict[str, Any] = {}
    if city:
        query["city"] = city
    if status:
        query["status"] = status

    projects = await db.projects.find(query).to_list(length=1000)
    items = []
    for project in projects:
        project_id_str = str(project["_id"])
        versions_count = await db.versions.count_documents(
            {"project_id": project_id_str, "status": "published"}
        )
        score = await compute_civic_score("project", project_id_str, db)
        items.append({
            "id": project_id_str,
            "title": project.get("title", ""),
            "ward": project.get("ward", ""),
            "category": project.get("category", ""),
            "status": project.get("status", ""),
            "city": project.get("city", ""),
            "current_civic_score": score.model_dump(mode="json"),
            "published_version_count": versions_count,
        })
    return items


async def get_b2b_org_summary(db, org_id: str) -> dict[str, Any]:
    """Retrieve usage and status summary for a B2B partner organization."""
    org = await db.organizations.find_one({"_id": org_id})
    if not org:
        return {}

    api_keys = await db.api_keys.find({"org_id": org_id}).to_list(length=100)
    key_ids = [str(k["_id"]) for k in api_keys]
    total_calls = await db.api_usage_logs.count_documents({"api_key_id": {"$in": key_ids}})

    return {
        "org_id": org_id,
        "name": org.get("name"),
        "tier": org.get("subscription_tier"),
        "status": org.get("subscription_status"),
        "active_api_keys": len([k for k in api_keys if k.get("active")]),
        "total_api_calls": total_calls,
    }


async def generate_b2b_export(db, city: str | None = None) -> dict[str, Any]:
    """Generate structured B2B dataset export."""
    projects = await get_b2b_projects(db, city=city)
    scores = await get_b2b_civic_scores(db, city=city)
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "total_projects": len(projects),
        "projects": projects,
        "civic_scores": scores,
    }