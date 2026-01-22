from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.build import BuildStatus


class BuildBase(BaseModel):
    vehicle_id: str
    engine_id: str
    transmission_id: Optional[str] = None


class BuildCreate(BuildBase):
    pass


class BuildUpdate(BaseModel):
    engine_position: Optional[dict] = None
    accessory_config: Optional[dict] = None
    collision_data: Optional[dict] = None
    status: Optional[BuildStatus] = None
    transmission_id: Optional[str] = None


class BuildResponse(BuildBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    engine_position: Optional[dict] = None
    accessory_config: Optional[dict] = None
    collision_data: Optional[dict] = None
    status: BuildStatus
    created_at: datetime


class BuildList(BaseModel):
    builds: list[BuildResponse]
    total: int


class BuildExport(BaseModel):
    build: BuildResponse
    vehicle: dict
    engine: dict
    transmission: Optional[dict] = None
    recommendations: Optional[list[str]] = None
