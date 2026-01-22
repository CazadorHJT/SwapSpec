from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.vehicle import QualityStatus


class VehicleBase(BaseModel):
    year: int
    make: str
    model: str
    trim: Optional[str] = None
    vin_pattern: Optional[str] = None
    bay_scan_mesh_url: Optional[str] = None
    modifications: Optional[dict] = None


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
    raw_data: Optional[dict] = None
