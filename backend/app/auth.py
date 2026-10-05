"""JWT auth + RBAC — role claims mirror the demo CAP_MATRIX (docs/PLAN.md §4)."""
from __future__ import annotations

import hashlib
import secrets
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import PBKDF2_ITERATIONS, SECRET_KEY, TOKEN_EXPIRE_MINUTES

# --- Capability matrix (port of src/store/auth.tsx CAP_MATRIX) ----------------

CAPS: dict[str, list[str]] = {
    "view-dashboard": ["national", "state", "district", "field", "village"],
    "view-villages": ["national", "state", "district", "field", "village"],
    "view-alerts": ["national", "state", "district", "field", "village"],
    "view-sensors": ["national", "state", "district", "field"],
    "view-analytics": ["national", "state", "district"],
    "view-sources": ["national", "state"],
    "view-admin": ["national"],
    "scenario": ["national", "state", "district"],
    "alert-ack": ["national", "state", "district", "field"],
    "alert-issue": ["national", "state", "district"],
    "alert-resolve": ["national", "state"],
}

ROLES = ("national", "state", "district", "field", "village")

bearer_scheme = HTTPBearer(auto_error=False)


# --- Password hashing (PBKDF2-HMAC-SHA256, no extra deps) ----------------------

def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS)
    return salt, digest.hex()


def verify_password(password: str, salt: str, expected_hex: str) -> bool:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS)
    return secrets.compare_digest(digest.hex(), expected_hex)


# --- JWT -----------------------------------------------------------------------

def create_token(user: dict[str, Any]) -> str:
    claims = {
        "sub": user["email"],
        "name": user["name"],
        "role": user["role"],
        "org": user["org"],
        "posting": user["posting"],
        "scopeState": user.get("scopeState"),
        "scopeDistrict": user.get("scopeDistrict"),
        "scopeVillageId": user.get("scopeVillageId"),
        "caps": [cap for cap, roles in CAPS.items() if user["role"] in roles],
    }
    return jwt.encode(claims, SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return decode_token(creds.credentials)


def require_cap(cap: str):
    """Endpoint dependency enforcing the RBAC matrix (403 on missing capability)."""

    def dep(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        if cap not in user.get("caps", []):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Role '{user.get('role')}' lacks capability '{cap}'",
            )
        return user

    return dep
