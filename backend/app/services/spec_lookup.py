"""
Spec Lookup Orchestrator — merges data from CarQuery + NHTSA APIs
and enriches engine/vehicle records with sourced specs.
"""
import logging
from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.engine import Engine
from app.models.vehicle import Vehicle
from app.services.carquery_client import CarQueryClient
from app.services.vin_decoder import VINDecoderService

logger = logging.getLogger(__name__)


@dataclass
class SpecLookupResult:
    specs: dict = field(default_factory=dict)
    sources: dict = field(default_factory=dict)
    confidence: str = "low"


# NHTSA variable names → our field names
NHTSA_ENGINE_MAP = {
    "Valve Train Design": "valve_train",
    "Engine Configuration": "engine_configuration",
    "Drive Type": "drive_type",
    "Fuel Type - Primary": "fuel_type",
    "Turbo": "turbo",
    "Displacement (L)": "displacement_liters",
    "Displacement (CC)": "displacement_cc",
    "Engine Number of Cylinders": "cylinders",
}

NHTSA_TRANSMISSION_MAP = {
    "Transmission Style": "trans_type",
    "Transmission Speeds": "gear_count",
}


class SpecLookupService:
    def __init__(self):
        self.carquery = CarQueryClient()
        self.vin_decoder = VINDecoderService()

    async def lookup_engine_specs(
        self,
        make: str,
        model: str,
        year: Optional[int] = None,
        trim: Optional[str] = None,
    ) -> SpecLookupResult:
        """Query CarQuery + NHTSA, merge, return with sources."""
        result = SpecLookupResult()

        # 1. CarQuery lookup
        if year:
            cq_specs = await self.carquery.search_engine_specs(make, model, year, trim)
            if cq_specs:
                for field_name, value in cq_specs.items():
                    result.specs[field_name] = value
                    result.sources[field_name] = "carquery_api"
                result.confidence = "high" if len(cq_specs) >= 3 else "medium"

        if not result.specs:
            result.confidence = "low"

        return result

    async def lookup_vehicle_specs(
        self,
        make: str,
        model: str,
        year: int,
        vin: Optional[str] = None,
        trim: Optional[str] = None,
    ) -> SpecLookupResult:
        """Query NHTSA (via VIN if available) + CarQuery, merge."""
        result = SpecLookupResult()

        # 1. NHTSA via VIN
        if vin and len(vin) == 17:
            nhtsa_result = await self.vin_decoder.decode(vin)
            if nhtsa_result.raw_data and "Results" in nhtsa_result.raw_data:
                nhtsa_specs = self._parse_nhtsa_results(
                    nhtsa_result.raw_data["Results"]
                )
                for field_name, value in nhtsa_specs.items():
                    result.specs[field_name] = value
                    result.sources[field_name] = "nhtsa_api"

        # 2. CarQuery for weight and other specs
        cq_specs = await self.carquery.search_vehicle_specs(make, model, year, trim)
        if cq_specs:
            for field_name, value in cq_specs.items():
                if field_name not in result.specs:  # NHTSA takes priority
                    result.specs[field_name] = value
                    result.sources[field_name] = "carquery_api"

        if result.specs:
            result.confidence = "high" if len(result.specs) >= 3 else "medium"
        else:
            result.confidence = "low"

        return result

    async def enrich_engine(self, engine_id: str, db: AsyncSession) -> Optional[Engine]:
        """Look up specs for existing engine, fill nulls, save."""
        q = await db.execute(select(Engine).where(Engine.id == engine_id))
        engine = q.scalar_one_or_none()
        if not engine:
            return None

        # Try to infer year from variant if present
        year = None
        if engine.variant:
            # Try to extract 4-digit year from variant
            import re
            match = re.search(r"\b(19|20)\d{2}\b", engine.variant)
            if match:
                year = int(match.group())

        result = await self.lookup_engine_specs(
            make=engine.make, model=engine.model, year=year
        )

        if not result.specs:
            return engine

        # Merge: only fill null fields
        current_sources = engine.data_sources or {}
        changed = False

        for field_name, value in result.specs.items():
            if hasattr(engine, field_name) and getattr(engine, field_name) is None:
                setattr(engine, field_name, value)
                current_sources[field_name] = result.sources.get(field_name, "carquery_api")
                changed = True

        if changed:
            engine.data_sources = current_sources
            await db.commit()
            await db.refresh(engine)

        return engine

    async def enrich_vehicle(self, vehicle_id: str, db: AsyncSession) -> Optional[Vehicle]:
        """Look up specs for existing vehicle, fill nulls, save."""
        q = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        vehicle = q.scalar_one_or_none()
        if not vehicle:
            return None

        result = await self.lookup_vehicle_specs(
            make=vehicle.make,
            model=vehicle.model,
            year=vehicle.year,
            trim=vehicle.trim,
        )

        if not result.specs:
            return vehicle

        current_sources = vehicle.data_sources or {}
        changed = False

        for field_name, value in result.specs.items():
            if hasattr(vehicle, field_name) and getattr(vehicle, field_name) is None:
                setattr(vehicle, field_name, value)
                current_sources[field_name] = result.sources.get(field_name, "carquery_api")
                changed = True

        if changed:
            vehicle.data_sources = current_sources
            await db.commit()
            await db.refresh(vehicle)

        return vehicle

    def _parse_nhtsa_results(self, results: list) -> dict:
        """Parse relevant specs from NHTSA vPIC results."""
        parsed = {}
        for item in results:
            variable = item.get("Variable", "")
            value = item.get("Value")
            if not value or value.strip() == "":
                continue

            if variable == "Valve Train Design":
                parsed["valve_train"] = value.strip()
            elif variable == "Displacement (L)":
                try:
                    parsed["displacement_liters"] = round(float(value), 1)
                except ValueError:
                    pass
            elif variable == "Transmission Style":
                parsed["trans_type"] = value.strip()
            elif variable == "Transmission Speeds":
                try:
                    parsed["gear_count"] = int(float(value))
                except ValueError:
                    pass

        return parsed
