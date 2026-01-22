# SwapSpec Backend

Python FastAPI backend for the SwapSpec engine swap planning platform.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `SECRET_KEY`: Generate a secure random key for production
- `ANTHROPIC_API_KEY`: Your Anthropic API key for the AI Advisor

### 3. Initialize Database

```bash
# Run seed data script (creates tables and adds sample data)
python seed_data.py
```

### 4. Run the Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### 5. Access Documentation

- **Interactive API docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Current user info

### Engines
- `GET /api/engines` - List engines (filterable by make, hp)
- `GET /api/engines/{id}` - Get engine details
- `POST /api/engines` - Add engine (requires auth)

### Transmissions
- `GET /api/transmissions` - List transmissions
- `GET /api/transmissions/{id}` - Get transmission details
- `GET /api/transmissions/compatible/{engine_id}` - Get compatible transmissions

### Vehicles
- `GET /api/vehicles` - List scanned vehicles
- `GET /api/vehicles/{id}` - Get vehicle details
- `POST /api/vehicles` - Upload new scan (requires auth)
- `GET /api/vehicles/decode-vin/{vin}` - Decode VIN

### Builds
- `GET /api/builds` - List user's builds
- `POST /api/builds` - Create build project
- `GET /api/builds/{id}` - Get build details
- `PUT /api/builds/{id}` - Update build
- `GET /api/builds/{id}/export` - Export build summary

### AI Advisor
- `POST /api/advisor/chat` - Chat with AI Build Advisor

## Testing

```bash
pip install pytest pytest-anyio
pytest tests/
```

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application
│   ├── config.py         # Settings
│   ├── database.py       # Database setup
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic
│   └── utils/            # Utilities (auth, etc.)
├── alembic/              # Database migrations
├── tests/                # Test files
├── seed_data.py          # Sample data script
└── requirements.txt
```

## Database

The backend uses SQLite for development. For production, configure PostgreSQL by updating `DATABASE_URL`:

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/swapspec
```

## AI Advisor

The AI Build Advisor uses Claude to provide context-aware guidance. It requires:
1. An `ANTHROPIC_API_KEY` in your `.env`
2. A valid build project to provide context

The advisor falls back to mock responses if no API key is configured.
