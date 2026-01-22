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


class EngineCreate(EngineBase):
    pass


class EngineResponse(EngineBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class EngineList(BaseModel):
    engines: list[EngineResponse]
    total: int
