from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


def utc_now():
    return datetime.now(timezone.utc)


class AccountType(str, enum.Enum):
    hobbyist = "hobbyist"
    professional = "professional"


class SubscriptionStatus(str, enum.Enum):
    free = "free"
    per_project = "per_project"
    subscription = "subscription"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType), default=AccountType.hobbyist
    )
    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.free
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    contributed_vehicles = relationship("Vehicle", back_populates="contributor")
    builds = relationship("Build", back_populates="user")
