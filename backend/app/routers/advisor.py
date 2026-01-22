from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.build import Build
from app.models.user import User
from app.schemas.advisor import AdvisorRequest, AdvisorResponse
from app.services.advisor import AdvisorService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/advisor", tags=["AI Advisor"])
advisor_service = AdvisorService()


@router.post("/chat", response_model=AdvisorResponse)
async def chat_with_advisor(
    request: AdvisorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to the AI Build Advisor and get a response."""
    # Verify the build belongs to the current user
    result = await db.execute(
        select(Build).where(Build.id == request.build_id, Build.user_id == current_user.id)
    )
    build = result.scalar_one_or_none()
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found or access denied",
        )

    # Get AI response
    response_text, sources = await advisor_service.chat(
        db=db,
        build_id=request.build_id,
        message=request.message,
        conversation_history=request.conversation_history,
    )

    return AdvisorResponse(response=response_text, sources=sources)
