from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.build import Build
from app.models.user import User
from app.models.chat_message import ChatMessage as ChatMessageModel
from app.schemas.advisor import (
    AdvisorRequest,
    AdvisorResponse,
    ChatMessage,
    ChatHistoryResponse,
    ChatMessageResponse,
)
from app.services.advisor import AdvisorService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/advisor", tags=["AI Advisor"])
advisor_service = AdvisorService()


async def _verify_build_ownership(db: AsyncSession, build_id: str, user_id: str) -> Build:
    """Verify a build belongs to the user and return it."""
    result = await db.execute(
        select(Build).where(Build.id == build_id, Build.user_id == user_id)
    )
    build = result.scalar_one_or_none()
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found or access denied",
        )
    return build


async def _load_chat_history(db: AsyncSession, build_id: str) -> list[ChatMessage]:
    """Load chat history from database for a build."""
    result = await db.execute(
        select(ChatMessageModel)
        .where(ChatMessageModel.build_id == build_id)
        .order_by(ChatMessageModel.created_at)
    )
    messages = result.scalars().all()
    return [ChatMessage(role=m.role, content=m.content) for m in messages]


async def _persist_message(db: AsyncSession, build_id: str, role: str, content: str) -> ChatMessageModel:
    """Persist a chat message to the database."""
    message = ChatMessageModel(build_id=build_id, role=role, content=content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.get("/chat/{build_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    build_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the chat history for a build."""
    await _verify_build_ownership(db, build_id, current_user.id)

    # Get messages
    result = await db.execute(
        select(ChatMessageModel)
        .where(ChatMessageModel.build_id == build_id)
        .order_by(ChatMessageModel.created_at)
    )
    messages = result.scalars().all()

    # Get count
    count_result = await db.execute(
        select(func.count()).select_from(ChatMessageModel).where(ChatMessageModel.build_id == build_id)
    )
    total = count_result.scalar()

    return ChatHistoryResponse(
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        total=total,
    )


@router.delete("/chat/{build_id}/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    build_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear the chat history for a build."""
    await _verify_build_ownership(db, build_id, current_user.id)

    # Delete all messages for this build
    result = await db.execute(
        select(ChatMessageModel).where(ChatMessageModel.build_id == build_id)
    )
    messages = result.scalars().all()
    for message in messages:
        await db.delete(message)
    await db.commit()


@router.post("/chat", response_model=AdvisorResponse)
async def chat_with_advisor(
    request: AdvisorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to the AI Build Advisor and get a response.

    Messages are automatically persisted to the database. The conversation
    history is loaded from the database, ignoring any client-sent history.
    """
    await _verify_build_ownership(db, request.build_id, current_user.id)

    # Load conversation history from database (ignore client-sent history)
    conversation_history = await _load_chat_history(db, request.build_id)

    # Persist user message
    await _persist_message(db, request.build_id, "user", request.message)

    # Get AI response
    response_text, sources = await advisor_service.chat(
        db=db,
        build_id=request.build_id,
        message=request.message,
        conversation_history=conversation_history,
    )

    # Persist assistant response
    await _persist_message(db, request.build_id, "assistant", response_text)

    return AdvisorResponse(response=response_text, sources=sources)
