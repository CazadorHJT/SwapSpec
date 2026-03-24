import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def _utc_now():
    return datetime.now(timezone.utc)


class IngestJob(Base):
    __tablename__ = "ingest_jobs"

    job_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    stage: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")
    chunks_indexed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gaps_filled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)
