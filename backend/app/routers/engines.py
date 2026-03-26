import json
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from app.database import get_db
from app.models.engine import Engine
from app.models.user import User
from app.schemas.engine import (
    EngineCreate, EngineResponse, EngineList,
    EngineFamily, EngineFamilyVariant, EngineIdentifyResponse, EngineIdentifySuggestion,
)
from app.utils.auth import get_current_user
from app.services.spec_lookup import SpecLookupService

logger = logging.getLogger(__name__)

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


@router.get("/families", response_model=List[EngineFamily])
async def list_engine_families(
    make: Optional[str] = Query(None, description="Filter by engine make"),
    db: AsyncSession = Depends(get_db),
):
    """Return all engines grouped by engine_family for drill-down selection."""
    query = select(Engine)
    if make:
        query = query.where(Engine.make.ilike(f"%{make}%"))

    result = await db.execute(query.order_by(Engine.make, Engine.model))
    engines = result.scalars().all()

    # Group by engine_family (fall back to model for ungrouped)
    family_map: dict[str, dict] = {}
    for eng in engines:
        family_key = eng.engine_family or eng.model
        make_key = eng.make
        if family_key not in family_map:
            family_map[family_key] = {"family": family_key, "make": make_key, "variants": []}
        family_map[family_key]["variants"].append(EngineFamilyVariant(
            id=eng.id,
            model=eng.model,
            variant=eng.variant,
            power_hp=eng.power_hp,
            torque_lb_ft=eng.torque_lb_ft,
            displacement_liters=eng.displacement_liters,
        ))

    return [EngineFamily(**v) for v in family_map.values()]


@router.post("/identify", response_model=EngineIdentifyResponse)
async def identify_engine(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI-powered engine identification from a free-text query."""
    query_text = payload.get("query", "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="query is required")

    api_key = os.environ.get("ANTHROPIC_API_KEY")

    suggestions: List[EngineIdentifySuggestion] = []

    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            prompt = (
                f'Identify the engine(s) described by: "{query_text}"\n\n'
                "Return a JSON array of 1-3 engine objects with these fields (all optional except make/model):\n"
                "make, model, variant, engine_family, displacement_liters, power_hp, torque_lb_ft,\n"
                "origin_year, origin_make, origin_model, origin_variant, confidence (high/medium/low), explanation.\n\n"
                "Respond ONLY with valid JSON array, no markdown."
            )
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = msg.content[0].text.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:])
                raw = raw.rsplit("```", 1)[0].strip()
            data = json.loads(raw)
            for item in data[:3]:
                suggestions.append(EngineIdentifySuggestion(**item))
        except Exception as exc:
            logger.warning(f"Engine identify AI call failed: {exc}")

    if not suggestions:
        suggestions.append(EngineIdentifySuggestion(
            make="Unknown",
            model=query_text,
            confidence="low",
            explanation="Could not identify engine. Please provide make and model manually.",
        ))

    # Check if any suggestion matches an existing engine
    existing_match_id = None
    for sug in suggestions:
        if sug.confidence in ("high", "medium"):
            result = await db.execute(
                select(Engine).where(
                    Engine.make.ilike(sug.make),
                    Engine.model.ilike(sug.model),
                )
            )
            match = result.scalar_one_or_none()
            if match:
                existing_match_id = match.id
                break

    return EngineIdentifyResponse(suggestions=suggestions, existing_match_id=existing_match_id)


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
