import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


def utc_now():
    return datetime.now(timezone.utc)


class QualityStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    trim: Mapped[str] = mapped_column(String(100), nullable=True)
    vin_pattern: Mapped[str] = mapped_column(String(50), nullable=True)
    bay_scan_mesh_url: Mapped[str] = mapped_column(String(500), nullable=True)
    contributor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    quality_status: Mapped[QualityStatus] = mapped_column(
        Enum(QualityStatus), default=QualityStatus.pending
    )
    modifications: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    contributor = relationship("User", back_populates="contributed_vehicles")
