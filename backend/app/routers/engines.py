from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models.engine import Engine
from app.models.user import User
from app.schemas.engine import EngineCreate, EngineResponse, EngineList
from app.utils.auth import get_current_user
from app.services.spec_lookup import SpecLookupService

router = APIRouter(prefix="/api/engines", tags=["Engines"])
spec_lookup = SpecLookupService()


@router.get("", response_model=EngineList)
async def list_engines(
    make: Optional[str] = Query(None, description="Filter by engine make"),
    min_hp: Optional[int] = Query(None, description="Minimum horsepower"),
    max_hp: Optional[int] = Query(None, description="Maximum horsepower"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all engines with optional filtering."""
    query = select(Engine)

    if make:
        query = query.where(Engine.make.ilike(f"%{make}%"))
    if min_hp:
        query = query.where(Engine.power_hp >= min_hp)
    if max_hp:
        query = query.where(Engine.power_hp <= max_hp)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit).order_by(Engine.make, Engine.model)
    result = await db.execute(query)
    engines = result.scalars().all()

    return EngineList(engines=engines, total=total)


@router.get("/{engine_id}", response_model=EngineResponse)
async def get_engine(engine_id: str, db: AsyncSession = Depends(get_db)):
    """Get engine details by ID."""
    result = await db.execute(select(Engine).where(Engine.id == engine_id))
    engine = result.scalar_one_or_none()
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engine not found",
        )
    return engine


@router.post("", response_model=EngineResponse, status_code=status.HTTP_201_CREATED)
async def create_engine(
    engine_data: EngineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new engine entry (requires authentication).
    Auto-enriches with API data for any null spec fields."""
    # Tag user-provided fields
    user_fields = {
        k: v for k, v in engine_data.model_dump(exclude_unset=True).items()
        if v is not None and k not in ("make", "model", "variant", "mesh_file_url", "mount_points",
                                        "data_sources", "data_source_notes")
    }
    initial_sources = {field: "user_contributed" for field in user_fields}

    engine = Engine(**engine_data.model_dump())
    engine.data_sources = initial_sources if initial_sources else None
    db.add(engine)
    await db.commit()
    await db.refresh(engine)

    # Auto-enrich from APIs (best-effort, non-blocking failure)
    try:
        await spec_lookup.enrich_engine(engine.id, db)
        # Refresh to get enriched data
        await db.refresh(engine)
    except Exception:
        pass  # enrichment is best-effort

    return engine


@router.post("/{engine_id}/enrich", response_model=EngineResponse)
async def enrich_engine(
    engine_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger spec enrichment for an engine from external APIs."""
    engine = await spec_lookup.enrich_engine(engine_id, db)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engine not found",
        )
    return engine
