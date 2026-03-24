import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db

logger = logging.getLogger(__name__)
from app.routers import (
    auth_router,
    engines_router,
    transmissions_router,
    vehicles_router,
    users_router,
    builds_router,
    advisor_router,
    files_router,
    specs_router,
    manuals_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed (app will still start): {e}")
    yield


app = FastAPI(
    title="SwapSpec API",
    description="Backend API for SwapSpec engine swap planning platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:19006",  # Expo web
        "https://swapspec.vercel.app",
        "https://swap-spec-r53r.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(engines_router)
app.include_router(transmissions_router)
app.include_router(vehicles_router)
app.include_router(users_router)
app.include_router(builds_router)
app.include_router(advisor_router)
app.include_router(files_router)
app.include_router(specs_router)
app.include_router(manuals_router)


@app.get("/")
async def root():
    return {
        "name": "SwapSpec API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "v6"}


@app.get("/health/db")
async def db_health_check():
    import asyncio
    from app.database import engine
    from sqlalchemy import text
    try:
        async with asyncio.timeout(5):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        return {"db": "connected"}
    except Exception as e:
        return {"db": f"error: {str(e)}"}
