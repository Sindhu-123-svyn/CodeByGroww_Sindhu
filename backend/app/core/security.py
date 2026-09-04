"""Password hashing + JWT issuance/verification for the minimal-auth scope
(design §6 — "minimal auth is enough to demonstrate per-user state", no
OAuth/SSO, no refresh-token/session-table complexity).

Uses `bcrypt` directly rather than passlib: passlib 1.7.4's bcrypt backend
has a known incompatibility with bcrypt>=4.1 (AttributeError on
`bcrypt.__about__`), so we skip that layer entirely.
"""
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """False (not a 500) on any malformed hash — covers SEED_DATA.sql's
    non-bcrypt placeholder hashes failing closed instead of raising.
    """
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: uuid.UUID, email: str) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    now = datetime.now(timezone.utc)
    expires_in = settings.jwt_expire_minutes * 60
    payload = {"sub": str(user_id), "email": email, "iat": now, "exp": now + timedelta(seconds=expires_in)}
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict:
    """Raises jose.JWTError on invalid/expired tokens — caller translates
    that into the 401 DomainError."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
