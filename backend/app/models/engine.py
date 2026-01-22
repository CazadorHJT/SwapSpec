import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Engine(Base):
    __tablename__ = "engines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    variant: Mapped[str] = mapped_column(String(100), nullable=True)
    dimensions_h: Mapped[float] = mapped_column(Float, nullable=True)
    dimensions_w: Mapped[float] = mapped_column(Float, nullable=True)
    dimensions_l: Mapped[float] = mapped_column(Float, nullable=True)
    weight: Mapped[float] = mapped_column(Float, nullable=True)
    fuel_pressure_psi: Mapped[float] = mapped_column(Float, nullable=True)
    fuel_flow_lph: Mapped[float] = mapped_column(Float, nullable=True)
    cooling_btu_min: Mapped[float] = mapped_column(Float, nullable=True)
    power_hp: Mapped[int] = mapped_column(Integer, nullable=True)
    torque_lb_ft: Mapped[int] = mapped_column(Integer, nullable=True)
    mesh_file_url: Mapped[str] = mapped_column(String(500), nullable=True)
    mount_points: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
