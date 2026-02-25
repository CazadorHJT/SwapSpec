from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _resolve_user_id(token: str) -> str:
    """Resolve a token to a user ID using local auth or Supabase."""
    settings = get_settings()
    if settings.local_dev:
        from app.services.local_auth import local_get_user
        result = local_get_user(token)
        if not result:
            raise ValueError("Invalid token")
        return result["user_id"]

    from app.services.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        raise ValueError("Invalid token")
    return user_response.user.id


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        user_id = _resolve_user_id(token)
    except Exception:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    try:
        user_id = _resolve_user_id(token)
    except Exception:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
