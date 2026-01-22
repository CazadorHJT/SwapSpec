from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models.transmission import Transmission
from app.models.engine import Engine
from app.models.user import User
from app.schemas.transmission import TransmissionCreate, TransmissionResponse, TransmissionList
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/transmissions", tags=["Transmissions"])


@router.get("", response_model=TransmissionList)
async def list_transmissions(
    make: Optional[str] = Query(None, description="Filter by transmission make"),
    bellhousing_pattern: Optional[str] = Query(None, description="Filter by bellhousing pattern"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all transmissions with optional filtering."""
    query = select(Transmission)

    if make:
        query = query.where(Transmission.make.ilike(f"%{make}%"))
    if bellhousing_pattern:
        query = query.where(Transmission.bellhousing_pattern.ilike(f"%{bellhousing_pattern}%"))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit).order_by(Transmission.make, Transmission.model)
    result = await db.execute(query)
    transmissions = result.scalars().all()

    return TransmissionList(transmissions=transmissions, total=total)


@router.get("/{transmission_id}", response_model=TransmissionResponse)
async def get_transmission(transmission_id: str, db: AsyncSession = Depends(get_db)):
    """Get transmission details by ID."""
    result = await db.execute(select(Transmission).where(Transmission.id == transmission_id))
    transmission = result.scalar_one_or_none()
    if not transmission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transmission not found",
        )
    return transmission


@router.get("/compatible/{engine_id}", response_model=TransmissionList)
async def get_compatible_transmissions(
    engine_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get transmissions compatible with a specific engine based on bellhousing pattern."""
    # First get the engine to determine the bellhousing pattern
    engine_result = await db.execute(select(Engine).where(Engine.id == engine_id))
    engine = engine_result.scalar_one_or_none()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engine not found",
        )

    # Map common engine families to bellhousing patterns
    pattern_map = {
        "LS": "GM LS",
        "LT": "GM LS",  # LT uses same pattern
        "SBC": "GM SBC",
        "BBC": "GM BBC",
        "Coyote": "Ford Modular",
        "5.0": "Ford Modular",
        "HEMI": "Chrysler HEMI",
        "2JZ": "Toyota JZ",
        "RB": "Nissan RB",
        "SR20": "Nissan SR",
    }

    # Determine pattern from engine model
    target_pattern = None
    if engine.model:
        for key, pattern in pattern_map.items():
            if key.lower() in engine.model.lower():
                target_pattern = pattern
                break

    if target_pattern:
        query = select(Transmission).where(
            Transmission.bellhousing_pattern.ilike(f"%{target_pattern}%")
        )
    else:
        # Return all transmissions if no pattern match
        query = select(Transmission)

    result = await db.execute(query)
    transmissions = result.scalars().all()

    return TransmissionList(transmissions=transmissions, total=len(transmissions))


@router.post("", response_model=TransmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_transmission(
    transmission_data: TransmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new transmission entry (requires authentication)."""
    transmission = Transmission(**transmission_data.model_dump())
    db.add(transmission)
    await db.commit()
    await db.refresh(transmission)
    return transmission
