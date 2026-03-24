#!/usr/bin/env python3
"""Standalone script to re-index all extracted manuals with semantic breadcrumb paths.

Uses the safe re-index pattern:
1. index_manual() — upserts new semantic-path chunks (different keys from old numeric-path ones)
2. clear_stale_chunks() — deletes old 'pages > NNN' chunks ONLY after step 1 succeeds

If interrupted between steps, old data remains queryable (no data loss window).
Re-running is safe — the upsert is idempotent.

Usage (from backend/ with venv activated):
    python reindex_manuals.py [--dry-run]
"""

import asyncio
import sys
from pathlib import Path

# Allow running from backend/ directory
sys.path.insert(0, str(Path(__file__).parent))

import os
os.environ.setdefault("LOCAL_DEV", "true")  # skip Supabase auth for standalone use


async def main(dry_run: bool = False) -> None:
    from app.config import get_settings
    from app.services.rag_indexer import RAGIndexer

    settings = get_settings()
    extracted_root = Path(settings.manuals_storage_path) / "extracted"

    if not extracted_root.exists():
        print(f"No extracted manuals directory found at: {extracted_root}")
        return

    # Storage service for uploading diagram images (optional — skip if Supabase not configured)
    storage_service = None
    if settings.supabase_url and settings.supabase_anon_key:
        try:
            from app.services.storage import StorageService
            storage_service = StorageService()
            print("Supabase Storage connected — diagram images will be uploaded.")
        except Exception as e:
            print(f"Warning: Could not connect to Supabase Storage: {e}")
            print("Diagrams will be indexed as stubs without image URLs.")
    else:
        print("Supabase not configured — diagrams will be indexed as stubs.")

    # Discover all manual directories under extracted/
    manual_dirs = [d for d in sorted(extracted_root.iterdir()) if d.is_dir()]
    if not manual_dirs:
        print(f"No manual directories found under {extracted_root}")
        return

    print(f"Found {len(manual_dirs)} manual directories to re-index.\n")

    from app.database import async_session_maker

    indexer = RAGIndexer()

    for manual_dir in manual_dirs:
        # Parse make/year/model from directory name: "{Make}_{Year}_{Model}"
        parts = manual_dir.name.split("_", 2)
        if len(parts) < 3:
            print(f"[SKIP] Cannot parse make/year/model from: {manual_dir.name}")
            continue

        make, year_str, model = parts[0], parts[1], parts[2]
        try:
            year = int(year_str)
        except ValueError:
            print(f"[SKIP] Invalid year in directory name: {manual_dir.name}")
            continue

        label = f"{year} {make} {model}"
        print(f"[{label}] Re-indexing from {manual_dir} ...")

        if dry_run:
            html_count = len(list(manual_dir.rglob("*.html")))
            print(f"[{label}] DRY RUN — {html_count} HTML files found, skipping actual index.")
            continue

        try:
            async with async_session_maker() as db:
                # Step 1: Index with new semantic paths (upsert — different keys from old ones)
                # Pass session_factory so the indexer can refresh the connection every 500 chunks
                count = await indexer.index_manual(
                    manual_dir, make, model, year,
                    vehicle_id=None,
                    db=db,
                    scope="chassis",
                    storage_service=storage_service,
                    session_factory=async_session_maker,
                )
                print(f"[{label}] Re-indexed {count} chunks.")

            async with async_session_maker() as db:
                # Step 2: Delete stale numeric-path chunks ONLY after successful index
                deleted = await indexer.clear_stale_chunks(make, model, year, db, scope="chassis")
                if deleted > 0:
                    print(f"[{label}] Cleared {deleted} stale chunks (old 'pages > NNN' format).")
                else:
                    print(f"[{label}] No stale chunks to clear.")

        except Exception as e:
            print(f"[{label}] ERROR: {e}")
            print(f"[{label}] Old data preserved — re-run when fixed.")

    print("\nDone.")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("=== DRY RUN MODE — no changes will be made ===\n")
    asyncio.run(main(dry_run=dry_run))
