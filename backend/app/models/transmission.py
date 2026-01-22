import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Transmission(Base):
    __tablename__ = "transmissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    dimensions_h: Mapped[float] = mapped_column(Float, nullable=True)
    dimensions_w: Mapped[float] = mapped_column(Float, nullable=True)
    dimensions_l: Mapped[float] = mapped_column(Float, nullable=True)
    weight: Mapped[float] = mapped_column(Float, nullable=True)
    bellhousing_pattern: Mapped[str] = mapped_column(String(100), nullable=True)
    mesh_file_url: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
