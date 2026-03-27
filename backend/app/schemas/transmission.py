from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List


class TransmissionBase(BaseModel):
    make: str
    model: str
    dimensions_h: Optional[float] = None
    dimensions_w: Optional[float] = None
    dimensions_l: Optional[float] = None
    weight: Optional[float] = None
    bellhousing_pattern: Optional[str] = None
    mesh_file_url: Optional[str] = None

    # Transmission specs
    trans_type: Optional[str] = None
    gear_count: Optional[int] = None
    gear_ratios: Optional[dict] = None
    input_shaft_spline: Optional[str] = None
    output_shaft_spline: Optional[str] = None
    max_torque_capacity_lb_ft: Optional[int] = None
    shift_linkage_type: Optional[str] = None
    crossmember_drop_in: Optional[float] = None
    tailhousing_length_in: Optional[float] = None
    speedometer_drive: Optional[str] = None

    # Data provenance
    data_sources: Optional[dict] = None
    data_source_notes: Optional[str] = None

    # Drivetrain type
    drivetrain_type: Optional[str] = None

    # Variant hint for charm.li matching
    origin_variant: Optional[str] = None

    # Donor vehicle — which chassis manual contains docs for this transmission
    origin_year:  Optional[int] = None
    origin_make:  Optional[str] = None
    origin_model: Optional[str] = None


class TransmissionCreate(TransmissionBase):
    pass


class TransmissionResponse(TransmissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class TransmissionList(BaseModel):
    transmissions: list[TransmissionResponse]
    total: int


class TransmissionGroups(BaseModel):
    stock_for_engine: List[TransmissionResponse]
    chassis_original_label: Optional[str] = None
    chassis_original: List[TransmissionResponse]
    other_compatible: List[TransmissionResponse]


class TransmissionIdentifySuggestion(BaseModel):
    make: str
    model: str
    trans_type: Optional[str] = None
    gear_count: Optional[int] = None
    bellhousing_pattern: Optional[str] = None
    max_torque_capacity_lb_ft: Optional[int] = None
    drivetrain_type: Optional[str] = None
    origin_year: Optional[int] = None
    origin_make: Optional[str] = None
    origin_model: Optional[str] = None
    origin_variant: Optional[str] = None
    confidence: str = "medium"
    explanation: Optional[str] = None


class TransmissionIdentifyResponse(BaseModel):
    suggestions: List[TransmissionIdentifySuggestion]
    existing_match_id: Optional[str] = None
