"""Pytest configuration for SwapSpec tests."""
import os

# Override DATABASE_URL before any app imports so tests use SQLite
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_swapspec.db"
os.environ["SUPABASE_URL"] = "https://fake.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "fake-key"

# Clear the settings cache so it picks up test env vars
from app.config import get_settings
get_settings.cache_clear()

import pytest


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
