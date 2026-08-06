from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_api_key
from app.database import get_db
from app.services.b2b_service import (
    generate_b2b_export,
    get_b2b_civic_scores,
    get_b2b_projects,
)

router = APIRouter(prefix="/api/v1/b2b", tags=["b2b"])


@router.get("/civic-scores")
async def civic_scores(city: str | None = None, ward: str | None = None, api_key=Depends(require_api_key), db=Depends(get_db)):
    results = await get_b2b_civic_scores(db, city=city, ward=ward)
    return {"data": results, "error": None}


@router.get("/projects")
async def projects(city: str | None = None, status: str | None = None, api_key=Depends(require_api_key), db=Depends(get_db)):
    items = await get_b2b_projects(db, city=city, status=status)
    return {"data": items, "error": None}


@router.get("/export")
async def export_data(city: str | None = None, api_key=Depends(require_api_key), db=Depends(get_db)):
    data = await generate_b2b_export(db, city=city)
    return {"data": data, "error": None}