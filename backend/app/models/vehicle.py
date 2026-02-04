import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, JSON, Text, ForeignKey, Enum
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

    # Vehicle specs
    engine_bay_length_in: Mapped[float] = mapped_column(Float, nullable=True)
    engine_bay_width_in: Mapped[float] = mapped_column(Float, nullable=True)
    engine_bay_height_in: Mapped[float] = mapped_column(Float, nullable=True)
    firewall_to_radiator_in: Mapped[float] = mapped_column(Float, nullable=True)
    driveline_angle_deg: Mapped[float] = mapped_column(Float, nullable=True)
    transmission_tunnel_width_in: Mapped[float] = mapped_column(Float, nullable=True)
    transmission_tunnel_height_in: Mapped[float] = mapped_column(Float, nullable=True)
    curb_weight_lbs: Mapped[int] = mapped_column(Integer, nullable=True)
    stock_weight_distribution_front_pct: Mapped[float] = mapped_column(Float, nullable=True)
    steering_type: Mapped[str] = mapped_column(String(100), nullable=True)
    steering_clearance_notes: Mapped[str] = mapped_column(String(500), nullable=True)
    stock_ground_clearance_in: Mapped[float] = mapped_column(Float, nullable=True)

    # Data provenance
    data_sources: Mapped[dict] = mapped_column(JSON, nullable=True)
    data_source_notes: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    contributor = relationship("User", back_populates="contributed_vehicles")
