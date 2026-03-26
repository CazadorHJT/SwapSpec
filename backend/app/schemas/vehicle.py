from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.vehicle import QualityStatus


class VehicleBase(BaseModel):
    year: int
    make: str
    model: str
    trim: Optional[str] = None
    drive_type: Optional[str] = None
    body_style: Optional[str] = None
    doors: Optional[int] = None
    engine_displacement_l: Optional[float] = None
    engine_cylinders: Optional[int] = None
    vin_pattern: Optional[str] = None
    bay_scan_mesh_url: Optional[str] = None
    modifications: Optional[dict] = None

    # Vehicle specs
    engine_bay_length_in: Optional[float] = None
    engine_bay_width_in: Optional[float] = None
    engine_bay_height_in: Optional[float] = None
    firewall_to_radiator_in: Optional[float] = None
    driveline_angle_deg: Optional[float] = None
    transmission_tunnel_width_in: Optional[float] = None
    transmission_tunnel_height_in: Optional[float] = None
    curb_weight_lbs: Optional[int] = None
    stock_weight_distribution_front_pct: Optional[float] = None
    steering_type: Optional[str] = None
    steering_clearance_notes: Optional[str] = None
    stock_ground_clearance_in: Optional[float] = None

    # Stock transmission label for chassis-original grouping
    stock_transmission_model: Optional[str] = None

    # Data provenance
    data_sources: Optional[dict] = None
    data_source_notes: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleResponse(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    contributor_id: Optional[str] = None
    quality_status: QualityStatus
    created_at: datetime


class VehicleList(BaseModel):
    vehicles: list[VehicleResponse]
    total: int


class VINDecodeResponse(BaseModel):
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    trim: Optional[str] = None
    engine: Optional[str] = None
    drive_type: Optional[str] = None     # e.g. "4x4", "4x2", "AWD"
    cylinders: Optional[int] = None      # e.g. 4, 6, 8
    displacement_l: Optional[float] = None
    body_style: Optional[str] = None
    doors: Optional[int] = None
    raw_data: Optional[dict] = None
