# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run development server
uvicorn app.main:app --reload

# Run all tests
pytest tests/

# Run a single test file
pytest tests/test_api.py -v

# Run a specific test
pytest tests/test_api.py::test_register_user -v

# Initialize/reset database with seed data
python seed_data.py

# Install dependencies
pip install -r requirements.txt
```

## Architecture

This is a FastAPI backend for SwapSpec, an engine swap planning platform. It provides REST APIs for a Unity mobile app.

### Core Patterns

**Async SQLAlchemy with SQLite/PostgreSQL**: All database operations use async SQLAlchemy 2.0. The `get_db` dependency in `app/database.py` yields async sessions. Models use `Mapped` type hints.

**JWT Authentication**: Auth flow uses bcrypt for password hashing and python-jose for JWT tokens. The `get_current_user` dependency in `app/utils/auth.py` extracts and validates tokens from the Authorization header.

**Router Organization**: Each domain (engines, vehicles, builds, etc.) has its own router in `app/routers/`. All routers are prefixed with `/api/` and registered in `app/main.py`.

### Key Relationships

- **Users** own **Builds** and contribute **Vehicles**
- **Builds** reference one **Vehicle**, one **Engine**, and optionally one **Transmission**
- **Transmissions** are matched to **Engines** via bellhousing patterns

### AI Advisor Service

The advisor in `app/services/advisor.py` provides context-aware chat. It:
1. Loads the build and related entities (vehicle, engine, transmission)
2. Constructs a system prompt with specs (fuel pressure, cooling requirements, etc.)
3. Calls Claude API or returns mock responses if no API key

### External Integrations

- **NHTSA API**: VIN decoding in `app/services/vin_decoder.py`
- **Anthropic Claude**: AI advisor responses
- **Local/S3 Storage**: File storage service in `app/services/storage.py`

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - SQLite for dev (`sqlite+aiosqlite:///./swapspec.db`), PostgreSQL for prod
- `SECRET_KEY` - JWT signing key
- `ANTHROPIC_API_KEY` - Optional, enables AI advisor (falls back to mock)
