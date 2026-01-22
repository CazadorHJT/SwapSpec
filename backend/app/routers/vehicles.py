from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleList, VINDecodeResponse
from app.utils.auth import get_current_user
from app.services.vin_decoder import VINDecoderService

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])
vin_decoder = VINDecoderService()


@router.get("", response_model=VehicleList)
async def list_vehicles(
    year: Optional[int] = Query(None, description="Filter by model year"),
    make: Optional[str] = Query(None, description="Filter by make"),
    model: Optional[str] = Query(None, description="Filter by model"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all scanned vehicles with optional filtering."""
    query = select(Vehicle)

    if year:
        query = query.where(Vehicle.year == year)
    if make:
        query = query.where(Vehicle.make.ilike(f"%{make}%"))
    if model:
        query = query.where(Vehicle.model.ilike(f"%{model}%"))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit).order_by(Vehicle.year.desc(), Vehicle.make, Vehicle.model)
    result = await db.execute(query)
    vehicles = result.scalars().all()

    return VehicleList(vehicles=vehicles, total=total)


@router.get("/decode-vin/{vin}", response_model=VINDecodeResponse)
async def decode_vin(vin: str):
    """Decode a VIN to get vehicle year, make, model info."""
    return await vin_decoder.decode(vin)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    """Get vehicle details by ID."""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )
    return vehicle


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a new vehicle scan (requires authentication)."""
    vehicle = Vehicle(
        **vehicle_data.model_dump(),
        contributor_id=current_user.id,
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle
