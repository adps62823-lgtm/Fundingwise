from __future__ import annotations

# Every microservice an org can use inside the Command Center. This is the
# single source of truth for both the admin toggle UI and the backend gates
# in app/auth/dependencies.py (require_service). Add a new microservice here
# and it automatically shows up in the admin org-detail "Services" panel.
SERVICE_CATALOG = {
    "ai_planning": {
        "label": "AI Planning Engine",
        "description": "AI-drafted cost estimates, schedules, and contractor shortlists.",
    },
    "labor_management": {
        "label": "Labor Management",
        "description": "Worker roster and task assignment (Labor Console).",
    },
    "inventory_management": {
        "label": "Inventory Management",
        "description": "Equipment/material catalog and dispatch tracking (Inventory Console).",
    },
    "b2b_api": {
        "label": "B2B Data API",
        "description": "Civic score & project data API access for this org's issued API keys.",
    },
}

# Default state for a brand-new org: every subscribed service is on until an
# admin explicitly suspends one. This is intentionally independent of
# subscription_status - a suspended *service* is not the same thing as a
# suspended *subscription* (an org can be on an active plan but have one
# microservice individually turned off, or vice versa).
DEFAULT_SERVICES = {key: True for key in SERVICE_CATALOG}


def normalize_services(raw: dict | None) -> dict:
    """Merge whatever is stored on the org doc with the current catalog, so
    older orgs (created before a given service existed) still get a sane
    default instead of a missing key breaking a lookup."""
    merged = dict(DEFAULT_SERVICES)
    if raw:
        for key, value in raw.items():
            if key in SERVICE_CATALOG:
                merged[key] = bool(value)
    return merged
