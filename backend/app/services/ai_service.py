from __future__ import annotations

import json
from typing import Any

from app.config import settings

GEMINI_MODEL = "models/gemini-flash-latest"

try:
    from google import genai
except Exception:  # optional dependency/runtime fallback
    genai = None


def _mock_cost_and_timeline(synopsis: str, category: str, city: str) -> dict[str, Any]:
    base = 750000 if category in {"road", "drain"} else 350000
    return {
        "cost_breakdown": [
            {"item": f"{category.title()} materials", "category": "materials", "estimated_cost_inr": base * 0.45, "notes": "Mock estimate"},
            {"item": "Labor", "category": "labor", "estimated_cost_inr": base * 0.30, "notes": "Mock estimate"},
            {"item": "Equipment", "category": "equipment", "estimated_cost_inr": base * 0.15, "notes": "Mock estimate"},
            {"item": "Overhead", "category": "overhead", "estimated_cost_inr": base * 0.10, "notes": "Mock estimate"},
        ],
        "total_estimate_inr": base,
        "duration_days": 21 if category in {"streetlight", "water_supply"} else 45,
        "risk_notes": [f"Mock AI draft for {city}", synopsis[:120]],
        "confidence": 0.74,
        "contractor_suggestions": [
            {"name": f"{city} Infrastructure Works Pvt. Ltd.", "specialty": category, "rating": 4.5, "unverified": True},
            {"name": f"MetroBuild Associates", "specialty": "public works", "rating": 4.2, "unverified": True},
        ],
        "schedule": [
            {"task": "Site survey", "day_start": 1, "day_end": 2, "description": "Mock planning step", "suggested_labor_count": 3, "suggested_equipment": "survey tools"},
            {"task": "Execution", "day_start": 3, "day_end": 15, "description": "Mock execution step", "suggested_labor_count": 8, "suggested_equipment": "machine, truck"},
        ],
    }


async def generate_cost_and_timeline(synopsis: str, category: str, city: str) -> dict[str, Any]:
    if not settings.GEMINI_API_KEY or genai is None:
        return _mock_cost_and_timeline(synopsis, category, city)
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = (
        "You are an expert Indian municipal public-works estimator.\n"
        "Return only strict JSON with the following keys: cost_breakdown, total_estimate_inr, "
        "duration_days, risk_notes, confidence, contractor_suggestions, schedule.\n"
        "Each cost_breakdown item should include item, category, estimated_cost_inr, notes.\n"
        "Each schedule item should include task, day_start, day_end, description, suggested_labor_count, suggested_equipment.\n"
        "Contractor suggestions must be clearly marked as AI-suggested and unverified.\n\n"
        f"Synopsis: {synopsis}\n"
        f"Category: {category}\n"
        f"City: {city}"
    )
    schema = {
        "type": "object",
        "properties": {
            "cost_breakdown": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "item": {"type": "string"},
                        "category": {"type": "string"},
                        "estimated_cost_inr": {"type": "number"},
                        "notes": {"type": "string"},
                    },
                    "required": ["item", "category", "estimated_cost_inr", "notes"],
                },
            },
            "total_estimate_inr": {"type": "number"},
            "duration_days": {"type": "integer"},
            "risk_notes": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number"},
            "contractor_suggestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "specialty": {"type": "string"},
                        "rating": {"type": "number"},
                        "unverified": {"type": "boolean"},
                    },
                    "required": ["name", "specialty", "rating", "unverified"],
                },
            },
            "schedule": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "task": {"type": "string"},
                        "day_start": {"type": "integer"},
                        "day_end": {"type": "integer"},
                        "description": {"type": "string"},
                        "suggested_labor_count": {"type": "integer"},
                        "suggested_equipment": {"type": "string"},
                    },
                    "required": ["task", "day_start", "day_end", "description", "suggested_labor_count", "suggested_equipment"],
                },
            },
        },
        "required": ["cost_breakdown", "total_estimate_inr", "duration_days", "risk_notes", "confidence", "contractor_suggestions", "schedule"],
    }

    last_error: Exception | None = None
    for _ in range(2):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[prompt],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": schema,
                },
            )
            text = getattr(response, "text", "") or ""
            return json.loads(text)
        except Exception as exc:
            last_error = exc
    return _mock_cost_and_timeline(synopsis, category, city)
