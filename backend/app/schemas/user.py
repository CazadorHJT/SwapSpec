from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional
from app.models.user import AccountType, SubscriptionStatus


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    account_type: Optional[AccountType] = AccountType.hobbyist


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_type: AccountType
    subscription_status: SubscriptionStatus
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
