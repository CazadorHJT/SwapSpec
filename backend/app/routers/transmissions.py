import json
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from app.database import get_db
from app.models.transmission import Transmission
from app.models.engine import Engine
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.transmission import (
    TransmissionCreate, TransmissionResponse, TransmissionList,
    TransmissionGroups, TransmissionIdentifyResponse, TransmissionIdentifySuggestion,
)
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

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


@router.get("/for-build", response_model=TransmissionGroups)
async def get_transmissions_for_build(
    engine_id: str = Query(..., description="Engine ID"),
    vehicle_id: Optional[str] = Query(None, description="Vehicle ID for chassis-original info"),
    db: AsyncSession = Depends(get_db),
):
    """Return transmissions in 3 groups: stock-for-engine, chassis-original, other-compatible."""
    engine_result = await db.execute(select(Engine).where(Engine.id == engine_id))
    engine = engine_result.scalar_one_or_none()
    if not engine:
        raise HTTPException(status_code=404, detail="Engine not found")

    vehicle = None
    if vehicle_id:
        vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        vehicle = vehicle_result.scalar_one_or_none()

    all_trans_result = await db.execute(select(Transmission))
    all_transmissions = all_trans_result.scalars().all()

    stock_for_engine: List[Transmission] = []
    chassis_original: List[Transmission] = []
    other_compatible: List[Transmission] = []

    # Build compatible set using bellhousing pattern map
    pattern_map = {
        "LS": "GM LS", "LT": "GM LS", "SBC": "GM SBC", "BBC": "GM BBC",
        "Coyote": "Ford Modular", "5.0": "Ford Modular",
        "HEMI": "Chrysler HEMI",
        "2JZ": "Toyota JZ",
        "RB": "Nissan RB",
        "SR20": "Nissan SR",
    }
    target_pattern = None
    if engine.model:
        for key, pattern in pattern_map.items():
            if key.lower() in engine.model.lower():
                target_pattern = pattern
                break

    chassis_label = vehicle.stock_transmission_model if vehicle else None

    seen_ids: set[str] = set()

    for trans in all_transmissions:
        # 1. Stock for engine: same donor vehicle
        if (engine.origin_year and engine.origin_make and engine.origin_model
                and trans.origin_year == engine.origin_year
                and trans.origin_make == engine.origin_make
                and trans.origin_model == engine.origin_model):
            stock_for_engine.append(trans)
            seen_ids.add(trans.id)
            continue

    for trans in all_transmissions:
        if trans.id in seen_ids:
            continue
        # 2. Chassis original: name matches stock_transmission_model label
        if chassis_label and trans.model and chassis_label.lower() in trans.model.lower():
            chassis_original.append(trans)
            seen_ids.add(trans.id)
            continue

    for trans in all_transmissions:
        if trans.id in seen_ids:
            continue
        # 3. Other compatible: bellhousing pattern match
        if target_pattern and trans.bellhousing_pattern:
            if target_pattern.lower() in trans.bellhousing_pattern.lower():
                other_compatible.append(trans)
        elif not target_pattern:
            other_compatible.append(trans)

    return TransmissionGroups(
        stock_for_engine=stock_for_engine,
        chassis_original_label=chassis_label,
        chassis_original=chassis_original,
        other_compatible=other_compatible,
    )


@router.post("/identify", response_model=TransmissionIdentifyResponse)
async def identify_transmission(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI-powered transmission identification from a free-text query."""
    query_text = payload.get("query", "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="query is required")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    suggestions: List[TransmissionIdentifySuggestion] = []

    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            prompt = (
                f'Identify the transmission(s) described by: "{query_text}"\n\n'
                "Return a JSON array of 1-3 transmission objects with these fields (all optional except make/model):\n"
                "make, model, trans_type (Manual/Automatic), gear_count, bellhousing_pattern,\n"
                "max_torque_capacity_lb_ft, drivetrain_type, origin_year, origin_make, origin_model, origin_variant,\n"
                "confidence (high/medium/low), explanation.\n\n"
                "IMPORTANT: origin_year/origin_make/origin_model refer to the VEHICLE this transmission came from "
                "(e.g., T56 Magnum: origin_year=2002, origin_make='Chevrolet', origin_model='Camaro'). "
                "This is the donor car, NOT the transmission name. origin_variant is the transmission code. "
                "drivetrain_type should be one of: FWD, RWD, AWD, 4WD.\n\n"
                "Respond ONLY with valid JSON array, no markdown."
            )
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = msg.content[0].text.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:])
                raw = raw.rsplit("```", 1)[0].strip()
            data = json.loads(raw)
            for item in data[:3]:
                sug = TransmissionIdentifySuggestion(**item)
                # Reject self-referencing origin_model (AI confused trans name for donor vehicle)
                if sug.origin_model and sug.model and sug.origin_model.lower() == sug.model.lower():
                    sug.origin_model = None
                    sug.origin_year = None
                    sug.origin_make = None
                suggestions.append(sug)
        except Exception as exc:
            logger.warning(f"Transmission identify AI call failed: {exc}")

    if not suggestions:
        suggestions.append(TransmissionIdentifySuggestion(
            make="Unknown",
            model=query_text,
            confidence="low",
            explanation="Could not identify transmission. Please enter make and model manually.",
        ))

    existing_match_id = None
    for sug in suggestions:
        if sug.confidence in ("high", "medium"):
            result = await db.execute(
                select(Transmission).where(
                    Transmission.make.ilike(sug.make),
                    Transmission.model.ilike(sug.model),
                )
            )
            match = result.scalar_one_or_none()
            if match:
                existing_match_id = match.id
                break

    return TransmissionIdentifyResponse(suggestions=suggestions, existing_match_id=existing_match_id)


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
