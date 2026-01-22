from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.build import Build
from app.models.engine import Engine
from app.models.vehicle import Vehicle
from app.models.transmission import Transmission
from app.models.user import User
from app.schemas.build import BuildCreate, BuildResponse, BuildUpdate, BuildList, BuildExport
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/builds", tags=["Builds"])


@router.get("", response_model=BuildList)
async def list_builds(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List current user's build projects."""
    query = select(Build).where(Build.user_id == current_user.id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit).order_by(Build.created_at.desc())
    result = await db.execute(query)
    builds = result.scalars().all()

    return BuildList(builds=builds, total=total)


@router.get("/{build_id}", response_model=BuildResponse)
async def get_build(
    build_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get build project details."""
    result = await db.execute(
        select(Build).where(Build.id == build_id, Build.user_id == current_user.id)
    )
    build = result.scalar_one_or_none()
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found",
        )
    return build


@router.post("", response_model=BuildResponse, status_code=status.HTTP_201_CREATED)
async def create_build(
    build_data: BuildCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new build project."""
    # Verify vehicle exists
    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.id == build_data.vehicle_id)
    )
    if not vehicle_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle not found",
        )

    # Verify engine exists
    engine_result = await db.execute(
        select(Engine).where(Engine.id == build_data.engine_id)
    )
    if not engine_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Engine not found",
        )

    # Verify transmission if provided
    if build_data.transmission_id:
        trans_result = await db.execute(
            select(Transmission).where(Transmission.id == build_data.transmission_id)
        )
        if not trans_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transmission not found",
            )

    build = Build(
        **build_data.model_dump(),
        user_id=current_user.id,
    )
    db.add(build)
    await db.commit()
    await db.refresh(build)
    return build


@router.put("/{build_id}", response_model=BuildResponse)
async def update_build(
    build_id: str,
    build_data: BuildUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a build project (position, config, etc.)."""
    result = await db.execute(
        select(Build).where(Build.id == build_id, Build.user_id == current_user.id)
    )
    build = result.scalar_one_or_none()
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found",
        )

    # Update fields
    update_data = build_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(build, field, value)

    await db.commit()
    await db.refresh(build)
    return build


@router.get("/{build_id}/export", response_model=BuildExport)
async def export_build(
    build_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export build as a comprehensive summary."""
    # Get build with related entities
    result = await db.execute(
        select(Build).where(Build.id == build_id, Build.user_id == current_user.id)
    )
    build = result.scalar_one_or_none()
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found",
        )

    # Load related entities
    vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == build.vehicle_id))
    vehicle = vehicle_result.scalar_one_or_none()

    engine_result = await db.execute(select(Engine).where(Engine.id == build.engine_id))
    engine = engine_result.scalar_one_or_none()

    transmission = None
    if build.transmission_id:
        trans_result = await db.execute(
            select(Transmission).where(Transmission.id == build.transmission_id)
        )
        transmission = trans_result.scalar_one_or_none()

    # Generate recommendations based on build data
    recommendations = _generate_recommendations(engine, build)

    return BuildExport(
        build=build,
        vehicle={
            "id": vehicle.id,
            "year": vehicle.year,
            "make": vehicle.make,
            "model": vehicle.model,
            "trim": vehicle.trim,
        } if vehicle else {},
        engine={
            "id": engine.id,
            "make": engine.make,
            "model": engine.model,
            "variant": engine.variant,
            "power_hp": engine.power_hp,
            "torque_lb_ft": engine.torque_lb_ft,
            "fuel_pressure_psi": engine.fuel_pressure_psi,
            "fuel_flow_lph": engine.fuel_flow_lph,
            "cooling_btu_min": engine.cooling_btu_min,
        } if engine else {},
        transmission={
            "id": transmission.id,
            "make": transmission.make,
            "model": transmission.model,
            "bellhousing_pattern": transmission.bellhousing_pattern,
        } if transmission else None,
        recommendations=recommendations,
    )


def _generate_recommendations(engine: Engine, build: Build) -> list[str]:
    """Generate basic recommendations based on engine specs and build data."""
    recommendations = []

    if engine:
        # Fuel system recommendations
        if engine.fuel_pressure_psi and engine.fuel_pressure_psi > 40:
            recommendations.append(
                f"High-pressure fuel system required: {engine.fuel_pressure_psi} psi. "
                "Consider returnless fuel system with proper regulator."
            )

        if engine.fuel_flow_lph and engine.fuel_flow_lph > 200:
            recommendations.append(
                f"High fuel flow requirement: {engine.fuel_flow_lph} lph. "
                "Upgrade fuel pump and verify fuel line sizing."
            )

        # Cooling recommendations
        if engine.cooling_btu_min and engine.cooling_btu_min > 10000:
            recommendations.append(
                f"Significant cooling capacity needed: {engine.cooling_btu_min} BTU/min. "
                "Consider aluminum radiator with electric fans."
            )

        # Weight/balance recommendations
        if engine.weight and engine.weight > 500:
            recommendations.append(
                f"Engine weight: {engine.weight} lbs. "
                "Verify frame mounting and consider weight distribution."
            )

    # Collision-based recommendations
    if build.collision_data:
        collisions = build.collision_data.get("collisions", [])
        for collision in collisions[:3]:  # Limit to top 3
            recommendations.append(f"Fitment issue detected: {collision}")

    return recommendations
