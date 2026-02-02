from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatMessageResponse(BaseModel):
    """Response schema for persisted chat messages."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    build_id: str
    role: str
    content: str
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    """Response schema for chat history."""
    messages: list[ChatMessageResponse]
    total: int


class AdvisorRequest(BaseModel):
    build_id: str
    message: str
    conversation_history: Optional[list[ChatMessage]] = None


class AdvisorResponse(BaseModel):
    response: str
    sources: Optional[list[str]] = None
