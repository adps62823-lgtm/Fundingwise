from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import settings


@lru_cache
def _firebase_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        service_account_info: Any = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        cred = credentials.Certificate(service_account_info)
    elif settings.FIREBASE_SERVICE_ACCOUNT_PATH:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
    else:
        cred = credentials.ApplicationDefault()

    init_kwargs = {}
    if settings.FIREBASE_PROJECT_ID:
        init_kwargs["options"] = {"projectId": settings.FIREBASE_PROJECT_ID}

    return firebase_admin.initialize_app(cred, **init_kwargs)


def verify_firebase_token(token: str) -> dict[str, Any]:
    _firebase_app()
    return firebase_auth.verify_id_token(token, check_revoked=True)
