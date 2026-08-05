from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId


def stringify(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [stringify(item) for item in value]
    if isinstance(value, dict):
        return {key: stringify(val) for key, val in value.items()}
    return value


def serialize_doc(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    data = stringify(dict(doc))
    if "_id" in data and "id" not in data:
        data["id"] = data["_id"]
    data.pop("_id", None)
    return data
