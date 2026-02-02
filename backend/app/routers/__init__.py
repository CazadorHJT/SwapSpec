from app.routers.auth import router as auth_router
from app.routers.engines import router as engines_router
from app.routers.transmissions import router as transmissions_router
from app.routers.vehicles import router as vehicles_router
from app.routers.users import router as users_router
from app.routers.builds import router as builds_router
from app.routers.advisor import router as advisor_router
from app.routers.files import router as files_router

__all__ = [
    "auth_router",
    "engines_router",
    "transmissions_router",
    "vehicles_router",
    "users_router",
    "builds_router",
    "advisor_router",
    "files_router",
]
