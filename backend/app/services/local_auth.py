"""Local auth implementation for development without Supabase."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from app.config import get_settings

# In-memory password store: email -> {hashed_password, user_id}
_local_users: dict[str, dict] = {}


def _get_secret():
    return get_settings().secret_key


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def local_sign_up(email: str, password: str) -> dict:
    if email in _local_users:
        raise Exception("User already registered")
    user_id = str(uuid.uuid4())
    _local_users[email] = {
        "hashed_password": _hash_password(password),
        "user_id": user_id,
    }
    return {"user_id": user_id, "email": email}


def local_sign_in(email: str, password: str) -> dict:
    record = _local_users.get(email)
    if not record or not _verify_password(password, record["hashed_password"]):
        raise Exception("Incorrect email or password")
    token = jwt.encode(
        {
            "sub": record["user_id"],
            "email": email,
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        },
        _get_secret(),
        algorithm="HS256",
    )
    return {"access_token": token, "user_id": record["user_id"]}


def local_get_user(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, _get_secret(), algorithms=["HS256"])
        return {"user_id": payload["sub"], "email": payload.get("email")}
    except jwt.PyJWTError:
        return None
