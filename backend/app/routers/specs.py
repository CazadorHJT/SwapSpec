from fastapi import APIRouter, Query
from typing import Optional
from pydantic import BaseModel
from app.services.spec_lookup import SpecLookupService

router = APIRouter(prefix="/api/specs", tags=["Spec Lookup"])
spec_lookup = SpecLookupService()


class SpecLookupResponse(BaseModel):
    specs: dict
    sources: dict
    confidence: str


@router.get("/lookup/engine", response_model=SpecLookupResponse)
async def lookup_engine_specs(
    make: str = Query(..., description="Engine manufacturer"),
    model: str = Query(..., description="Engine model name"),
    year: Optional[int] = Query(None, description="Model year for lookup"),
    trim: Optional[str] = Query(None, description="Trim level"),
):
    """Look up engine specs from external APIs without saving.
    Returns available specs from CarQuery + NHTSA."""
    result = await spec_lookup.lookup_engine_specs(make, model, year, trim)
    return SpecLookupResponse(
        specs=result.specs,
        sources=result.sources,
        confidence=result.confidence,
    )


@router.get("/lookup/vehicle", response_model=SpecLookupResponse)
async def lookup_vehicle_specs(
    make: str = Query(..., description="Vehicle manufacturer"),
    model: str = Query(..., description="Vehicle model"),
    year: int = Query(..., description="Model year"),
    vin: Optional[str] = Query(None, description="VIN for NHTSA lookup"),
    trim: Optional[str] = Query(None, description="Trim level"),
):
    """Look up vehicle specs from external APIs without saving.
    Returns available specs from NHTSA + CarQuery."""
    result = await spec_lookup.lookup_vehicle_specs(make, model, year, vin, trim)
    return SpecLookupResponse(
        specs=result.specs,
        sources=result.sources,
        confidence=result.confidence,
    )
