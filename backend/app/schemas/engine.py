from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class EngineBase(BaseModel):
    make: str
    model: str
    variant: Optional[str] = None
    dimensions_h: Optional[float] = None
    dimensions_w: Optional[float] = None
    dimensions_l: Optional[float] = None
    weight: Optional[float] = None
    fuel_pressure_psi: Optional[float] = None
    fuel_flow_lph: Optional[float] = None
    cooling_btu_min: Optional[float] = None
    power_hp: Optional[int] = None
    torque_lb_ft: Optional[int] = None
    mesh_file_url: Optional[str] = None
    mount_points: Optional[dict] = None

    # Internal specs
    displacement_liters: Optional[float] = None
    compression_ratio: Optional[float] = None
    valve_train: Optional[str] = None
    bore_mm: Optional[float] = None
    stroke_mm: Optional[float] = None
    balance_type: Optional[str] = None
    cam_intake_lift_in: Optional[float] = None
    cam_exhaust_lift_in: Optional[float] = None
    cam_intake_duration_deg: Optional[int] = None
    cam_exhaust_duration_deg: Optional[int] = None
    redline_rpm: Optional[int] = None
    idle_rpm: Optional[int] = None

    # Geometry
    oil_pan_depth_in: Optional[float] = None
    oil_pan_type: Optional[str] = None
    front_accessory_drive_depth_in: Optional[float] = None

    # Thermal
    cooling_system_type: Optional[str] = None
    thermostat_temp_f: Optional[int] = None
    exhaust_port_shape: Optional[str] = None
    exhaust_header_primary_od_in: Optional[float] = None
    recommended_radiator_rows: Optional[int] = None

    # Electronics
    can_bus_protocol: Optional[str] = None
    ecu_type: Optional[str] = None
    starter_position: Optional[str] = None
    distributor_type: Optional[str] = None

    # Data provenance
    data_sources: Optional[dict] = None
    data_source_notes: Optional[str] = None


class EngineCreate(EngineBase):
    pass


class EngineResponse(EngineBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class EngineList(BaseModel):
    engines: list[EngineResponse]
    total: int
