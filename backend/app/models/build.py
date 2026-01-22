import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, JSON, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


def utc_now():
    return datetime.now(timezone.utc)


class BuildStatus(str, enum.Enum):
    draft = "draft"
    complete = "complete"


class Build(Base):
    __tablename__ = "builds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id"), nullable=False)
    engine_id: Mapped[str] = mapped_column(String(36), ForeignKey("engines.id"), nullable=False)
    transmission_id: Mapped[str] = mapped_column(String(36), ForeignKey("transmissions.id"), nullable=True)
    engine_position: Mapped[dict] = mapped_column(JSON, nullable=True)
    accessory_config: Mapped[dict] = mapped_column(JSON, nullable=True)
    collision_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    status: Mapped[BuildStatus] = mapped_column(Enum(BuildStatus), default=BuildStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="builds")
    vehicle = relationship("Vehicle")
    engine = relationship("Engine")
    transmission = relationship("Transmission")
