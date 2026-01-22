from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TransmissionBase(BaseModel):
    make: str
    model: str
    dimensions_h: Optional[float] = None
    dimensions_w: Optional[float] = None
    dimensions_l: Optional[float] = None
    weight: Optional[float] = None
    bellhousing_pattern: Optional[str] = None
    mesh_file_url: Optional[str] = None


class TransmissionCreate(TransmissionBase):
    pass


class TransmissionResponse(TransmissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class TransmissionList(BaseModel):
    transmissions: list[TransmissionResponse]
    total: int
