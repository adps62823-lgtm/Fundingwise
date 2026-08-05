from __future__ import annotations

from datetime import datetime, timezone

from app.models.civic_score import CivicScoreResult

TRUSTED_THRESHOLD = 1
POSITIVE_WEIGHT = 40
NEGATIVE_WEIGHT = 40
BASE_SCORE = 50


async def compute_civic_score(entity_type: str, entity_id: str, db) -> CivicScoreResult:
    if entity_type == "project":
        reports = await db.reports.find({"project_id": entity_id}).to_list(length=1000)
    elif entity_type == "ward":
        projects = await db.projects.find({"ward": entity_id}).to_list(length=1000)
        project_ids = [str(project["_id"]) for project in projects]
        reports = await db.reports.find({"project_id": {"$in": project_ids}}).to_list(length=1000)
    else:
        reports = []

    trusted_positive = 0
    trusted_negative = 0
    total_reports = len(reports)

    for report in reports:
        net = report.get("verification_count_up", 0) - report.get("verification_count_down", 0)
        if net < TRUSTED_THRESHOLD:
            continue
        if report.get("report_type") in {"progress_update", "completion_claim"}:
            trusted_positive += 1
        elif report.get("report_type") == "issue":
            trusted_negative += 1

    score = BASE_SCORE + min(POSITIVE_WEIGHT, trusted_positive * 5) - min(NEGATIVE_WEIGHT, trusted_negative * 5)
    score = max(0, min(100, score))
    return CivicScoreResult(
        entity_type=entity_type,
        entity_id=entity_id,
        score=score,
        total_reports=total_reports,
        verified_positive=trusted_positive,
        verified_negative=trusted_negative,
        last_updated=datetime.now(timezone.utc),
    )
