from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.database import init_db
from app.config import get_settings
from app.routers import (
    auth_router,
    engines_router,
    transmissions_router,
    vehicles_router,
    users_router,
    builds_router,
    advisor_router,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables
    await init_db()
    # Ensure uploads directory exists
    Path(settings.storage_path).mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="SwapSpec API",
    description="Backend API for SwapSpec engine swap planning platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for Unity/mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
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

# Serve uploaded files
uploads_path = Path(settings.storage_path)
if uploads_path.exists():
    app.mount("/api/files", StaticFiles(directory=str(uploads_path)), name="files")


@app.get("/")
async def root():
    return {
        "name": "SwapSpec API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
