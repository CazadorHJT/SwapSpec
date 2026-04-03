from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole, AccountType, SubscriptionStatus
from app.models.vehicle import Vehicle, QualityStatus
from app.models.engine import Engine
from app.models.transmission import Transmission
from app.models.build import Build
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleList
from app.schemas.engine import EngineCreate, EngineResponse, EngineList
from app.schemas.transmission import TransmissionCreate, TransmissionResponse, TransmissionList
from app.schemas.build import BuildResponse, BuildList
from app.schemas.user import UserResponse
from app.utils.auth import get_admin_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ---------- Request schemas ----------

class StatusUpdate(BaseModel):
    quality_status: QualityStatus


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    account_type: Optional[AccountType] = None
    subscription_status: Optional[SubscriptionStatus] = None


class AdminStats(BaseModel):
    pending_vehicles: int
    pending_engines: int
    pending_transmissions: int
    total_users: int
    total_builds: int


# ---------- Dashboard ----------

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Admin dashboard — counts of pending items, users, and builds."""
    pending_vehicles = (await db.execute(
        select(func.count()).select_from(Vehicle).where(Vehicle.quality_status == QualityStatus.pending)
    )).scalar()
    pending_engines = (await db.execute(
        select(func.count()).select_from(Engine).where(Engine.quality_status == QualityStatus.pending)
    )).scalar()
    pending_transmissions = (await db.execute(
        select(func.count()).select_from(Transmission).where(Transmission.quality_status == QualityStatus.pending)
    )).scalar()
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    total_builds = (await db.execute(select(func.count()).select_from(Build))).scalar()

    return AdminStats(
        pending_vehicles=pending_vehicles,
        pending_engines=pending_engines,
        pending_transmissions=pending_transmissions,
        total_users=total_users,
        total_builds=total_builds,
    )


# ---------- Vehicle approval + CRUD ----------

@router.get("/vehicles", response_model=VehicleList)
async def admin_list_vehicles(
    quality_status: Optional[QualityStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """List vehicles filtered by quality_status (admin sees all statuses)."""
    query = select(Vehicle)
    if quality_status:
        query = query.where(Vehicle.quality_status == quality_status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.offset(skip).limit(limit).order_by(Vehicle.year.desc(), Vehicle.make, Vehicle.model)
    vehicles = (await db.execute(query)).scalars().all()
    return VehicleList(vehicles=vehicles, total=total)


@router.patch("/vehicles/{vehicle_id}/status", response_model=VehicleResponse)
async def update_vehicle_status(
    vehicle_id: str,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Approve or reject a vehicle."""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.quality_status = body.quality_status
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_vehicle(
    vehicle_data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Create a vehicle directly as approved (admin only)."""
    import uuid
    vehicle = Vehicle(**vehicle_data.model_dump())
    vehicle.id = str(uuid.uuid4())
    vehicle.quality_status = QualityStatus.approved
    vehicle.contributor_id = admin.id
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def admin_update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Edit any vehicle field (admin only)."""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for field, value in vehicle_data.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_vehicle(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Delete a vehicle. Returns 409 if referenced by any builds."""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    build_count = (await db.execute(
        select(func.count()).select_from(Build).where(Build.vehicle_id == vehicle_id)
    )).scalar()
    if build_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {build_count} build(s) reference this vehicle. Delete or reassign them first.",
        )
    await db.delete(vehicle)
    await db.commit()


# ---------- Engine approval + CRUD ----------

@router.get("/engines", response_model=EngineList)
async def admin_list_engines(
    quality_status: Optional[QualityStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    query = select(Engine)
    if quality_status:
        query = query.where(Engine.quality_status == quality_status)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    engines = (await db.execute(query.offset(skip).limit(limit).order_by(Engine.make, Engine.model))).scalars().all()
    return EngineList(engines=engines, total=total)


@router.patch("/engines/{engine_id}/status", response_model=EngineResponse)
async def update_engine_status(
    engine_id: str,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(Engine).where(Engine.id == engine_id))
    engine = result.scalar_one_or_none()
    if not engine:
        raise HTTPException(status_code=404, detail="Engine not found")
    engine.quality_status = body.quality_status
    await db.commit()
    await db.refresh(engine)
    return engine


@router.post("/engines", response_model=EngineResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_engine(
    engine_data: EngineCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Create an engine directly as approved (admin only)."""
    engine = Engine(**engine_data.model_dump())
    engine.quality_status = QualityStatus.approved
    engine.contributor_id = admin.id
    db.add(engine)
    await db.commit()
    await db.refresh(engine)
    return engine


@router.put("/engines/{engine_id}", response_model=EngineResponse)
async def admin_update_engine(
    engine_id: str,
    engine_data: EngineCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(Engine).where(Engine.id == engine_id))
    engine = result.scalar_one_or_none()
    if not engine:
        raise HTTPException(status_code=404, detail="Engine not found")
    for field, value in engine_data.model_dump(exclude_unset=True).items():
        setattr(engine, field, value)
    await db.commit()
    await db.refresh(engine)
    return engine


@router.delete("/engines/{engine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_engine(
    engine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(Engine).where(Engine.id == engine_id))
    engine = result.scalar_one_or_none()
    if not engine:
        raise HTTPException(status_code=404, detail="Engine not found")

    build_count = (await db.execute(
        select(func.count()).select_from(Build).where(Build.engine_id == engine_id)
    )).scalar()
    if build_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {build_count} build(s) reference this engine. Delete or reassign them first.",
        )
    await db.delete(engine)
    await db.commit()


# ---------- Transmission approval + CRUD ----------

@router.get("/transmissions", response_model=TransmissionList)
async def admin_list_transmissions(
    quality_status: Optional[QualityStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    query = select(Transmission)
    if quality_status:
        query = query.where(Transmission.quality_status == quality_status)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    transmissions = (await db.execute(query.offset(skip).limit(limit).order_by(Transmission.make, Transmission.model))).scalars().all()
    return TransmissionList(transmissions=transmissions, total=total)


@router.patch("/transmissions/{transmission_id}/status", response_model=TransmissionResponse)
async def update_transmission_status(
    transmission_id: str,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(Transmission).where(Transmission.id == transmission_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transmission not found")
    tx.quality_status = body.quality_status
    await db.commit()
    await db.refresh(tx)
    return tx


@router.post("/transmissions", response_model=TransmissionResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_transmission(
    tx_data: TransmissionCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    tx = Transmission(**tx_data.model_dump())
    tx.quality_status = QualityStatus.approved
    tx.contributor_id = admin.id
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


@router.put("/transmissions/{transmission_id}", response_model=TransmissionResponse)
async def admin_update_transmission(
    transmission_id: str,
    tx_data: TransmissionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(Transmission).where(Transmission.id == transmission_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transmission not found")
    for field, value in tx_data.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)
    await db.commit()
    await db.refresh(tx)
    return tx


@router.delete("/transmissions/{transmission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_transmission(
    transmission_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(Transmission).where(Transmission.id == transmission_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transmission not found")

    build_count = (await db.execute(
        select(func.count()).select_from(Build).where(Build.transmission_id == transmission_id)
    )).scalar()
    if build_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {build_count} build(s) reference this transmission. Delete or reassign them first.",
        )
    await db.delete(tx)
    await db.commit()


# ---------- User management ----------

class UserWithBuildCount(UserResponse):
    build_count: int


@router.get("/users", response_model=list[UserWithBuildCount])
async def admin_list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """List all users with their build counts."""
    users = (await db.execute(select(User).offset(skip).limit(limit).order_by(User.created_at.desc()))).scalars().all()

    result = []
    for user in users:
        build_count = (await db.execute(
            select(func.count()).select_from(Build).where(Build.user_id == user.id)
        )).scalar()
        result.append(UserWithBuildCount(
            id=user.id,
            email=user.email,
            role=user.role,
            account_type=user.account_type,
            subscription_status=user.subscription_status,
            created_at=user.created_at,
            build_count=build_count,
        ))
    return result


@router.patch("/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update a user's role, account type, or subscription status.
    Admins cannot change their own role (prevents last-admin lockout)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None and user_id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own role. Have another admin do this.",
        )

    if body.role is not None:
        user.role = body.role
    if body.account_type is not None:
        user.account_type = body.account_type
    if body.subscription_status is not None:
        user.subscription_status = body.subscription_status

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/users/{user_id}/builds", response_model=BuildList)
async def admin_get_user_builds(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """View all builds for any user (cross-user visibility)."""
    builds = (await db.execute(
        select(Build).where(Build.user_id == user_id).order_by(Build.created_at.desc())
    )).scalars().all()
    return BuildList(builds=builds, total=len(builds))


# ---------- Build management ----------

@router.delete("/builds/{build_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_build(
    build_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Delete any build (admin only). Cascades chat messages."""
    result = await db.execute(select(Build).where(Build.id == build_id))
    build = result.scalar_one_or_none()
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    await db.delete(build)
    await db.commit()
