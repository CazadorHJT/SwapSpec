from pydantic import BaseModel
from typing import Optional


class ManualIngestRequest(BaseModel):
    year: int
    make: str
    model: str
    vehicle_id: Optional[str] = None


class LocalManualIngestRequest(BaseModel):
    manual_dir: str
    make: str
    model: str
    year: int
    vehicle_id: Optional[str] = None


class IngestStatusResponse(BaseModel):
    job_id: Optional[str]
    status: str
    stage: str
    chunks_indexed: int
    gaps_filled: int
    error: Optional[str] = None


class ManualChunkResponse(BaseModel):
    id: str
    section_path: str
    content: str
    data_source: str
    confidence: str

    class Config:
        from_attributes = True


class ManualSearchResponse(BaseModel):
    chunks: list[ManualChunkResponse]
    total: int


class ManualUploadResponse(BaseModel):
    job_id: Optional[str]
    status: str
    message: str
