from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import (
    auth_router,
    engines_router,
    transmissions_router,
    vehicles_router,
    users_router,
    builds_router,
    advisor_router,
    files_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="SwapSpec API",
    description="Backend API for SwapSpec engine swap planning platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for Unity/mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
