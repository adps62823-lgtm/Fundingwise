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


def get_or_create_firebase_user(email: str, password: str) -> firebase_auth.UserRecord:
    """Server-side account creation via the Admin SDK - used only by the one-time
    admin bootstrap script (backend/bootstrap_admin.py). This never runs from a
    public-facing route; it's how the owner's own login gets created without
    exposing an admin option on the public /register page."""
    _firebase_app()
    try:
        user = firebase_auth.get_user_by_email(email)
        firebase_auth.update_user(user.uid, password=password, email_verified=True)
        return firebase_auth.get_user(user.uid)
    except firebase_auth.UserNotFoundError:
        return firebase_auth.create_user(email=email, password=password, email_verified=True)
