from __future__ import annotations

import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def generate_api_key() -> str:
    return secrets.token_urlsafe(24)[:32]


def generate_temp_password() -> str:
    """Generates a random per-employee login/recovery password.

    This is set as the employee's real Firebase Auth password via the Admin
    SDK (see app/services/firebase_auth.get_or_create_firebase_user), so it's
    a genuine, working credential - not a cosmetic placeholder. It is only
    ever returned to the calling admin ONCE, at generation/reset time; the
    backend never stores or re-displays the plaintext afterwards (see
    ORG employees endpoints in app/routes/subscriptions.py), only a hash for
    audit purposes and a `password_last_reset_at` timestamp.
    """
    # 12 chars, URL-safe alphabet - comfortably clears Firebase's 6-char
    # minimum and is easy enough to read aloud / copy-paste over a call.
    return secrets.token_urlsafe(9)
