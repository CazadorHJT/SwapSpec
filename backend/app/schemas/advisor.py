from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class AdvisorRequest(BaseModel):
    build_id: str
    message: str
    conversation_history: Optional[list[ChatMessage]] = None


class AdvisorResponse(BaseModel):
    response: str
    sources: Optional[list[str]] = None
