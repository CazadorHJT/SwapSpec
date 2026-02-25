"""Local auth implementation for development without Supabase."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext

from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory password store: email -> {hashed_password, user_id}
_local_users: dict[str, dict] = {}


def _get_secret():
    return get_settings().secret_key


def local_sign_up(email: str, password: str) -> dict:
    if email in _local_users:
        raise Exception("User already registered")
    user_id = str(uuid.uuid4())
    _local_users[email] = {
        "hashed_password": pwd_context.hash(password),
        "user_id": user_id,
    }
    return {"user_id": user_id, "email": email}


def local_sign_in(email: str, password: str) -> dict:
    record = _local_users.get(email)
    if not record or not pwd_context.verify(password, record["hashed_password"]):
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
