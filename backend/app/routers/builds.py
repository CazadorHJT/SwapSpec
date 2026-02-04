from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.build import Build
from app.models.engine import Engine
from app.models.vehicle import Vehicle
from app.models.transmission import Transmission
from app.models.user import User
from app.schemas.build import BuildCreate, BuildResponse, BuildUpdate, BuildList, BuildExport
from app.services.pdf_service import PDFService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/builds", tags=["Builds"])
pdf_service = PDFService()


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


def _build_engine_export(engine: Engine) -> dict:
    """Build engine export dict with expanded spec fields."""
    if not engine:
        return {}
    return {
        "id": engine.id,
        "make": engine.make,
        "model": engine.model,
        "variant": engine.variant,
        "power_hp": engine.power_hp,
        "torque_lb_ft": engine.torque_lb_ft,
        "fuel_pressure_psi": engine.fuel_pressure_psi,
        "fuel_flow_lph": engine.fuel_flow_lph,
        "cooling_btu_min": engine.cooling_btu_min,
        "displacement_liters": engine.displacement_liters,
        "compression_ratio": engine.compression_ratio,
        "valve_train": engine.valve_train,
        "bore_mm": engine.bore_mm,
        "stroke_mm": engine.stroke_mm,
        "balance_type": engine.balance_type,
        "redline_rpm": engine.redline_rpm,
        "can_bus_protocol": engine.can_bus_protocol,
        "oil_pan_depth_in": engine.oil_pan_depth_in,
        "data_sources": engine.data_sources,
    }


def _build_vehicle_export(vehicle: Vehicle) -> dict:
    """Build vehicle export dict with expanded spec fields."""
    if not vehicle:
        return {}
    return {
        "id": vehicle.id,
        "year": vehicle.year,
        "make": vehicle.make,
        "model": vehicle.model,
        "trim": vehicle.trim,
        "curb_weight_lbs": vehicle.curb_weight_lbs,
        "engine_bay_length_in": vehicle.engine_bay_length_in,
        "engine_bay_width_in": vehicle.engine_bay_width_in,
        "engine_bay_height_in": vehicle.engine_bay_height_in,
        "stock_ground_clearance_in": vehicle.stock_ground_clearance_in,
        "driveline_angle_deg": vehicle.driveline_angle_deg,
        "data_sources": vehicle.data_sources,
    }


def _build_transmission_export(transmission: Transmission) -> dict | None:
    """Build transmission export dict with expanded spec fields."""
    if not transmission:
        return None
    return {
        "id": transmission.id,
        "make": transmission.make,
        "model": transmission.model,
        "bellhousing_pattern": transmission.bellhousing_pattern,
        "trans_type": transmission.trans_type,
        "gear_count": transmission.gear_count,
        "gear_ratios": transmission.gear_ratios,
        "max_torque_capacity_lb_ft": transmission.max_torque_capacity_lb_ft,
        "input_shaft_spline": transmission.input_shaft_spline,
        "data_sources": transmission.data_sources,
    }


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
    recommendations = _generate_recommendations(engine, vehicle, transmission, build)

    return BuildExport(
        build=build,
        vehicle=_build_vehicle_export(vehicle),
        engine=_build_engine_export(engine),
        transmission=_build_transmission_export(transmission),
        recommendations=recommendations,
    )


@router.get("/{build_id}/export/pdf")
async def export_build_pdf(
    build_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export build as a PDF report."""
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

    # Generate recommendations
    recommendations = _generate_recommendations(engine, vehicle, transmission, build)

    # Create export data
    export_data = BuildExport(
        build=build,
        vehicle=_build_vehicle_export(vehicle),
        engine=_build_engine_export(engine),
        transmission=_build_transmission_export(transmission),
        recommendations=recommendations,
    )

    # Generate PDF
    try:
        pdf_bytes = await pdf_service.generate_build_report(export_data)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    # Generate filename
    vehicle_name = f"{vehicle.year}_{vehicle.make}_{vehicle.model}" if vehicle else "build"
    filename = f"swapspec_{vehicle_name}_report.pdf".replace(" ", "_")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _generate_recommendations(
    engine: Engine,
    vehicle: Vehicle,
    transmission: Transmission,
    build: Build,
) -> list[str]:
    """Generate recommendations based on engine specs, vehicle specs, and build data."""
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

        # External balance warning
        if engine.balance_type and engine.balance_type.lower() == "external":
            recommendations.append(
                "CRITICAL: Engine uses external balance. Flywheel/flexplate MUST match "
                "the engine's external balance specification. Using the wrong one will "
                "cause severe vibration and potential crankshaft damage."
            )

        # Compression ratio / fuel octane
        if engine.compression_ratio and engine.compression_ratio > 10.5:
            recommendations.append(
                f"Compression ratio: {engine.compression_ratio}:1. Premium fuel (91+ octane) "
                "recommended to prevent detonation."
            )

        # CAN bus protocol
        if engine.can_bus_protocol:
            recommendations.append(
                f"CAN bus protocol: {engine.can_bus_protocol}. Wiring harness must be "
                "compatible or a standalone ECU/CAN translator may be needed."
            )

        # Oil pan clearance vs vehicle ground clearance
        if engine.oil_pan_depth_in and vehicle and vehicle.stock_ground_clearance_in:
            if engine.oil_pan_depth_in > vehicle.stock_ground_clearance_in * 0.6:
                recommendations.append(
                    f"Oil pan depth ({engine.oil_pan_depth_in}\") may conflict with "
                    f"vehicle ground clearance ({vehicle.stock_ground_clearance_in}\"). "
                    "Consider a low-profile oil pan or crossmember modification."
                )

    # Driveline angle check
    if vehicle and vehicle.driveline_angle_deg and vehicle.driveline_angle_deg > 3.0:
        recommendations.append(
            f"Driveline angle: {vehicle.driveline_angle_deg}°. Angles over 3° may cause "
            "U-joint vibration. Consider an adjustable crossmember or transmission mount."
        )

    # Engine bay fitment math
    if engine and vehicle:
        if (engine.dimensions_l and vehicle.engine_bay_length_in and
                engine.dimensions_l > vehicle.engine_bay_length_in - 1.0):
            recommendations.append(
                f"Tight length fitment: engine is {engine.dimensions_l}\" vs bay "
                f"{vehicle.engine_bay_length_in}\". May need firewall or radiator "
                "support modifications."
            )
        if (engine.dimensions_w and vehicle.engine_bay_width_in and
                engine.dimensions_w > vehicle.engine_bay_width_in - 1.0):
            recommendations.append(
                f"Tight width fitment: engine is {engine.dimensions_w}\" vs bay "
                f"{vehicle.engine_bay_width_in}\". Check header/exhaust manifold clearance "
                "to frame rails and steering components."
            )

    # Torque capacity check
    if (engine and transmission and
            engine.torque_lb_ft and transmission.max_torque_capacity_lb_ft):
        ratio = engine.torque_lb_ft / transmission.max_torque_capacity_lb_ft
        if ratio > 0.85:
            recommendations.append(
                f"Engine torque ({engine.torque_lb_ft} lb-ft) is at "
                f"{int(ratio * 100)}% of transmission capacity "
                f"({transmission.max_torque_capacity_lb_ft} lb-ft). "
                "Consider upgrading internals or choosing a higher-capacity unit."
            )

    # Data completeness check
    if engine:
        missing_critical = []
        if not engine.displacement_liters:
            missing_critical.append("displacement")
        if not engine.compression_ratio:
            missing_critical.append("compression ratio")
        if not engine.valve_train:
            missing_critical.append("valve train type")
        if not engine.can_bus_protocol:
            missing_critical.append("CAN bus protocol")
        if missing_critical:
            recommendations.append(
                f"Missing critical engine specs: {', '.join(missing_critical)}. "
                "Consider using the Enrich endpoint or adding these manually for "
                "more accurate recommendations."
            )

    # Collision-based recommendations
    if build.collision_data:
        collisions = build.collision_data.get("collisions", [])
        for collision in collisions[:3]:  # Limit to top 3
            recommendations.append(f"Fitment issue detected: {collision}")

    return recommendations
