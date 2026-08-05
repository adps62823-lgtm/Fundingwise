from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends

from app.auth.dependencies import require_role
from app.database import get_db
from app.services.version_service import get_public_version_history

router = APIRouter(prefix="/api/v1/versions", tags=["versions"])


@router.get("/public/{project_id}")
async def public_history(project_id: str, db=Depends(get_db)):
    return {"data": await get_public_version_history(project_id, db), "error": None}


@router.get("/official/{project_id}")
async def official_history(project_id: str, user=Depends(require_role("official")), db=Depends(get_db)):
    return {"data": await get_public_version_history(project_id, db), "error": None}
