import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Transmission(Base):
    __tablename__ = "transmissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    dimensions_h: Mapped[float] = mapped_column(Float, nullable=True)
    dimensions_w: Mapped[float] = mapped_column(Float, nullable=True)
    dimensions_l: Mapped[float] = mapped_column(Float, nullable=True)
    weight: Mapped[float] = mapped_column(Float, nullable=True)
    bellhousing_pattern: Mapped[str] = mapped_column(String(100), nullable=True)
    mesh_file_url: Mapped[str] = mapped_column(String(500), nullable=True)

    # Transmission specs
    trans_type: Mapped[str] = mapped_column(String(50), nullable=True)
    gear_count: Mapped[int] = mapped_column(Integer, nullable=True)
    gear_ratios: Mapped[dict] = mapped_column(JSON, nullable=True)
    input_shaft_spline: Mapped[str] = mapped_column(String(100), nullable=True)
    output_shaft_spline: Mapped[str] = mapped_column(String(100), nullable=True)
    max_torque_capacity_lb_ft: Mapped[int] = mapped_column(Integer, nullable=True)
    shift_linkage_type: Mapped[str] = mapped_column(String(100), nullable=True)
    crossmember_drop_in: Mapped[float] = mapped_column(Float, nullable=True)
    tailhousing_length_in: Mapped[float] = mapped_column(Float, nullable=True)
    speedometer_drive: Mapped[str] = mapped_column(String(100), nullable=True)

    # Data provenance
    data_sources: Mapped[dict] = mapped_column(JSON, nullable=True)
    data_source_notes: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
