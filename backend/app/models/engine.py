import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, JSON, Text
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

    # Internal specs
    displacement_liters: Mapped[float] = mapped_column(Float, nullable=True)
    compression_ratio: Mapped[float] = mapped_column(Float, nullable=True)
    valve_train: Mapped[str] = mapped_column(String(50), nullable=True)
    bore_mm: Mapped[float] = mapped_column(Float, nullable=True)
    stroke_mm: Mapped[float] = mapped_column(Float, nullable=True)
    balance_type: Mapped[str] = mapped_column(String(50), nullable=True)
    cam_intake_lift_in: Mapped[float] = mapped_column(Float, nullable=True)
    cam_exhaust_lift_in: Mapped[float] = mapped_column(Float, nullable=True)
    cam_intake_duration_deg: Mapped[int] = mapped_column(Integer, nullable=True)
    cam_exhaust_duration_deg: Mapped[int] = mapped_column(Integer, nullable=True)
    redline_rpm: Mapped[int] = mapped_column(Integer, nullable=True)
    idle_rpm: Mapped[int] = mapped_column(Integer, nullable=True)

    # Geometry
    oil_pan_depth_in: Mapped[float] = mapped_column(Float, nullable=True)
    oil_pan_type: Mapped[str] = mapped_column(String(100), nullable=True)
    front_accessory_drive_depth_in: Mapped[float] = mapped_column(Float, nullable=True)

    # Thermal
    cooling_system_type: Mapped[str] = mapped_column(String(100), nullable=True)
    thermostat_temp_f: Mapped[int] = mapped_column(Integer, nullable=True)
    exhaust_port_shape: Mapped[str] = mapped_column(String(100), nullable=True)
    exhaust_header_primary_od_in: Mapped[float] = mapped_column(Float, nullable=True)
    recommended_radiator_rows: Mapped[int] = mapped_column(Integer, nullable=True)

    # Electronics
    can_bus_protocol: Mapped[str] = mapped_column(String(100), nullable=True)
    ecu_type: Mapped[str] = mapped_column(String(100), nullable=True)
    starter_position: Mapped[str] = mapped_column(String(100), nullable=True)
    distributor_type: Mapped[str] = mapped_column(String(100), nullable=True)

    # Data provenance
    data_sources: Mapped[dict] = mapped_column(JSON, nullable=True)
    data_source_notes: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
