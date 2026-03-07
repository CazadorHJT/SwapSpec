"""
Pre-populate charm.li service manual chunks for all seeded vehicles, engines,
and transmissions. Idempotent — skips any component already indexed.

Run from backend/ with the venv activated:
    python prepopulate_manuals.py

This script runs each ingest sequentially and prints live progress.
Expect each manual to take 30–120 seconds to download, extract, and index.
Vehicles not found on charm.li are marked as failed and skipped cleanly.
"""
import asyncio

from sqlalchemy import and_, func, select

from app.database import async_session_maker, init_db
from app.models.engine import Engine
from app.models.manual_chunk import ManualChunk
from app.models.transmission import Transmission
from app.models.vehicle import Vehicle
from app.services.manual_ingestor import ManualIngestor


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _already_indexed(
    session,
    scope: str,
    vehicle_make: str = None,
    vehicle_model: str = None,
    vehicle_year: int = None,
    engine_id: str = None,
    transmission_id: str = None,
) -> bool:
    """Return True if chunks already exist for this scope/component."""
    filters = [ManualChunk.scope == scope]
    if scope == "chassis":
        filters += [
            func.lower(ManualChunk.vehicle_make) == vehicle_make.lower(),
            func.lower(ManualChunk.vehicle_model) == vehicle_model.lower(),
            ManualChunk.vehicle_year == vehicle_year,
        ]
    elif scope == "engine":
        filters.append(ManualChunk.engine_id == engine_id)
    elif scope == "transmission":
        filters.append(ManualChunk.transmission_id == transmission_id)

    result = await session.execute(
        select(func.count(ManualChunk.id)).where(and_(*filters))
    )
    return (result.scalar() or 0) > 0


async def _run(ingestor: ManualIngestor, totals: dict, **pipeline_kwargs) -> None:
    """Run one ingest pipeline, update totals, print result."""
    print("    Downloading and indexing... ", end="", flush=True)
    async with async_session_maker() as session:
        year  = pipeline_kwargs.pop("year")
        make  = pipeline_kwargs.pop("make")
        model = pipeline_kwargs.pop("model")
        vid   = pipeline_kwargs.pop("vehicle_id", None)

        job_id = await ingestor.start_ingest(year, make, model, vid, session)
        await ingestor.run_pipeline(job_id, year, make, model, vid, session, **pipeline_kwargs)
        job = ingestor.get_status(job_id)

    if job.status == "complete":
        print(f"done  ({job.chunks_indexed} chunks, {job.gaps_filled} gaps filled)")
        totals["ok"] += 1
        totals["chunks"] += job.chunks_indexed
    else:
        print(f"FAILED")
        print(f"    Error: {job.error}")
        totals["failed"] += 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main() -> None:
    print("Initializing database...")
    await init_db()

    ingestor = ManualIngestor()
    totals = {"ok": 0, "failed": 0, "skipped": 0, "chunks": 0}

    # Load all entities
    async with async_session_maker() as session:
        vehicles = (await session.execute(select(Vehicle))).scalars().all()
        engines  = (await session.execute(
            select(Engine).where(Engine.origin_year.is_not(None))
        )).scalars().all()
        transmissions = (await session.execute(
            select(Transmission).where(Transmission.origin_year.is_not(None))
        )).scalars().all()

    print(
        f"Found: {len(vehicles)} vehicles, {len(engines)} engines, "
        f"{len(transmissions)} transmissions\n"
    )
    print("=" * 65)

    # -----------------------------------------------------------------------
    # 1. Chassis manuals
    # -----------------------------------------------------------------------
    print(f"\nCHASSIS MANUALS  ({len(vehicles)} vehicles)")
    for v in vehicles:
        label = f"{v.year} {v.make} {v.model}"
        print(f"\n  [{label}]")
        async with async_session_maker() as s:
            if await _already_indexed(s, "chassis", v.make, v.model, v.year):
                print("    Already indexed — skipping.")
                totals["skipped"] += 1
                continue
        await _run(
            ingestor, totals,
            year=v.year, make=v.make, model=v.model,
            vehicle_id=str(v.id),
            scope="chassis",
        )

    # -----------------------------------------------------------------------
    # 2. Engine manuals (indexed from donor vehicle)
    # -----------------------------------------------------------------------
    print(f"\nENGINE MANUALS  ({len(engines)} engines)")
    for e in engines:
        label = (
            f"{e.make} {e.model}"
            f"  ←  {e.origin_year} {e.origin_make} {e.origin_model} manual"
        )
        print(f"\n  [{label}]")
        async with async_session_maker() as s:
            if await _already_indexed(s, "engine", engine_id=str(e.id)):
                print("    Already indexed — skipping.")
                totals["skipped"] += 1
                continue
        await _run(
            ingestor, totals,
            year=e.origin_year, make=e.origin_make, model=e.origin_model,
            vehicle_id=None,
            scope="engine",
            engine_id=str(e.id),
        )

    # -----------------------------------------------------------------------
    # 3. Transmission manuals (indexed from donor vehicle)
    # -----------------------------------------------------------------------
    print(f"\nTRANSMISSION MANUALS  ({len(transmissions)} transmissions)")
    for t in transmissions:
        label = (
            f"{t.make} {t.model}"
            f"  ←  {t.origin_year} {t.origin_make} {t.origin_model} manual"
        )
        print(f"\n  [{label}]")
        async with async_session_maker() as s:
            if await _already_indexed(s, "transmission", transmission_id=str(t.id)):
                print("    Already indexed — skipping.")
                totals["skipped"] += 1
                continue
        await _run(
            ingestor, totals,
            year=t.origin_year, make=t.origin_make, model=t.origin_model,
            vehicle_id=None,
            scope="transmission",
            transmission_id=str(t.id),
        )

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print("\n" + "=" * 65)
    print(
        f"Complete.  "
        f"Succeeded: {totals['ok']}  "
        f"Failed: {totals['failed']}  "
        f"Already indexed: {totals['skipped']}"
    )
    print(f"Total new chunks written to Supabase: {totals['chunks']}")


if __name__ == "__main__":
    asyncio.run(main())
