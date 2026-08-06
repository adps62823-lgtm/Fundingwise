from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends

from app.auth.dependencies import require_service
from app.database import get_db
from app.utils.serializers import serialize_doc

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


@router.get("/items")
async def list_items(user=Depends(require_service("inventory_management")), db=Depends(get_db)):
    items = await db.inventory_items.find({"org_id": user["organization_id"]}).to_list(length=500)
    return {"data": [serialize_doc(item) for item in items], "error": None}


@router.post("/items")
async def create_item(payload: dict, user=Depends(require_service("inventory_management")), db=Depends(get_db)):
    doc = {**payload, "org_id": user["organization_id"], "created_at": __import__("datetime").datetime.utcnow(), "updated_at": __import__("datetime").datetime.utcnow()}
    result = await db.inventory_items.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"data": serialize_doc(doc), "error": None}


@router.patch("/items/{item_id}")
async def update_item(item_id: str, payload: dict, user=Depends(require_service("inventory_management")), db=Depends(get_db)):
    await db.inventory_items.update_one({"_id": ObjectId(item_id), "org_id": user["organization_id"]}, {"$set": {**payload, "updated_at": __import__("datetime").datetime.utcnow()}})
    item = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
    return {"data": serialize_doc(item), "error": None}


@router.get("/dispatch")
async def list_dispatch(project_id: str, user=Depends(require_service("inventory_management")), db=Depends(get_db)):
    items = await db.dispatches.find({"project_id": project_id, "org_id": user["organization_id"]}).to_list(length=1000)
    return {"data": [serialize_doc(item) for item in items], "error": None}


@router.post("/dispatch")
async def create_dispatch(payload: dict, user=Depends(require_service("inventory_management")), db=Depends(get_db)):
    doc = {**payload, "org_id": user["organization_id"], "created_at": __import__("datetime").datetime.utcnow(), "updated_at": __import__("datetime").datetime.utcnow()}
    result = await db.dispatches.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"data": serialize_doc(doc), "error": None}


@router.patch("/dispatch/{dispatch_id}")
async def update_dispatch(dispatch_id: str, payload: dict, user=Depends(require_service("inventory_management")), db=Depends(get_db)):
    await db.dispatches.update_one({"_id": ObjectId(dispatch_id), "org_id": user["organization_id"]}, {"$set": {**payload, "updated_at": __import__("datetime").datetime.utcnow()}})
    item = await db.dispatches.find_one({"_id": ObjectId(dispatch_id)})
    return {"data": serialize_doc(item), "error": None}
