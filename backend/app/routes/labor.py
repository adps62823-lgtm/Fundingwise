from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.database import get_db
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/labor", tags=["labor"])


@router.get("/workers")
async def list_workers(user=Depends(require_role("official")), db=Depends(get_db)):
    workers = await db.workers.find({"org_id": user["organization_id"]}).to_list(length=500)
    return {"data": [serialize_doc(worker) for worker in workers], "error": None}


@router.post("/workers")
async def create_worker(payload: dict, user=Depends(require_role("official")), db=Depends(get_db)):
    doc = {**payload, "org_id": user["organization_id"], "created_at": __import__("datetime").datetime.utcnow(), "updated_at": __import__("datetime").datetime.utcnow()}
    result = await db.workers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"data": serialize_doc(doc), "error": None}


@router.patch("/workers/{worker_id}")
async def update_worker(worker_id: str, payload: dict, user=Depends(require_role("official")), db=Depends(get_db)):
    await db.workers.update_one({"_id": ObjectId(worker_id), "org_id": user["organization_id"]}, {"$set": {**payload, "updated_at": __import__("datetime").datetime.utcnow()}})
    worker = await db.workers.find_one({"_id": ObjectId(worker_id)})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return {"data": serialize_doc(worker), "error": None}


@router.get("/assignments")
async def list_assignments(project_id: str, user=Depends(require_role("official")), db=Depends(get_db)):
    items = await db.assignments.find({"project_id": project_id, "org_id": user["organization_id"]}).to_list(length=1000)
    return {"data": [serialize_doc(item) for item in items], "error": None}


@router.post("/assignments")
async def create_assignment(payload: dict, user=Depends(require_role("official")), db=Depends(get_db)):
    doc = {**payload, "org_id": user["organization_id"], "created_at": __import__("datetime").datetime.utcnow(), "updated_at": __import__("datetime").datetime.utcnow()}
    result = await db.assignments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"data": serialize_doc(doc), "error": None}


@router.patch("/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, payload: dict, user=Depends(require_role("official")), db=Depends(get_db)):
    await db.assignments.update_one({"_id": ObjectId(assignment_id), "org_id": user["organization_id"]}, {"$set": {**payload, "updated_at": __import__("datetime").datetime.utcnow()}})
    item = await db.assignments.find_one({"_id": ObjectId(assignment_id)})
    return {"data": serialize_doc(item), "error": None}
