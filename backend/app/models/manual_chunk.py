import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ManualChunk(Base):
    __tablename__ = "manual_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Denormalized for easy lookup without joining vehicles
    vehicle_make: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_model: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_year: Mapped[int] = mapped_column(Integer, nullable=False)

    # Optional FK to vehicles table (chunk may exist before vehicle is in DB)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )

    # Human-readable path, e.g. "Engine > Specifications > General Engine Specifications"
    section_path: Mapped[str] = mapped_column(String(1000), nullable=False)

    # Extracted plain text from the HTML file
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # "charm_li" | "gap_filled_ai" | "gap_filled_web"
    data_source: Mapped[str] = mapped_column(String(50), nullable=False, default="charm_li")

    # "high" | "medium" | "low"
    confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="high")

    # URL used if gap-filled from web
    source_url: Mapped[str] = mapped_column(String(2000), nullable=True)

    # Scoping: "chassis" | "engine" | "transmission"
    scope: Mapped[str] = mapped_column(String(20), nullable=False, default="chassis")

    # FK to the specific engine/transmission this chunk belongs to (non-chassis scopes)
    engine_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("engines.id", ondelete="SET NULL"), nullable=True
    )
    transmission_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("transmissions.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
