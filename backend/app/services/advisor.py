from typing import Optional
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.models.build import Build
from app.models.engine import Engine
from app.models.vehicle import Vehicle
from app.models.transmission import Transmission
from app.schemas.advisor import ChatMessage

settings = get_settings()


class AdvisorService:
    def __init__(self):
        if settings.anthropic_api_key:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        else:
            self.client = None

    async def chat(
        self,
        db: AsyncSession,
        build_id: str,
        message: str,
        conversation_history: Optional[list[ChatMessage]] = None,
    ) -> tuple[str, list[str]]:
        # Load build context
        build_result = await db.execute(select(Build).where(Build.id == build_id))
        build = build_result.scalar_one_or_none()
        if not build:
            return "Build not found. Please select a valid build project.", []

        # Load related entities
        engine_result = await db.execute(select(Engine).where(Engine.id == build.engine_id))
        engine = engine_result.scalar_one_or_none()

        vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == build.vehicle_id))
        vehicle = vehicle_result.scalar_one_or_none()

        transmission = None
        if build.transmission_id:
            trans_result = await db.execute(
                select(Transmission).where(Transmission.id == build.transmission_id)
            )
            transmission = trans_result.scalar_one_or_none()

        # Build system prompt with context
        system_prompt = self._build_system_prompt(build, engine, vehicle, transmission)

        # Build messages
        messages = []
        if conversation_history:
            for msg in conversation_history:
                messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": message})

        # Call LLM
        if not self.client:
            return self._mock_response(message, engine, vehicle), ["Mock response - API key not configured"]

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            )
            sources = self._extract_sources(engine, vehicle, transmission)
            return response.content[0].text, sources
        except Exception as e:
            return f"Error communicating with AI advisor: {str(e)}", []

    def _build_system_prompt(
        self,
        build: Build,
        engine: Optional[Engine],
        vehicle: Optional[Vehicle],
        transmission: Optional[Transmission],
    ) -> str:
        vehicle_info = "Unknown vehicle"
        if vehicle:
            vehicle_info = f"{vehicle.year} {vehicle.make} {vehicle.model}"
            if vehicle.trim:
                vehicle_info += f" {vehicle.trim}"

        engine_info = "Unknown engine"
        engine_specs = ""
        if engine:
            engine_info = f"{engine.make} {engine.model}"
            if engine.variant:
                engine_info += f" ({engine.variant})"
            if engine.power_hp:
                engine_info += f" - {engine.power_hp}hp"

            engine_specs = f"""
    Engine Specifications:
    - Dimensions: {engine.dimensions_l or 'N/A'}L x {engine.dimensions_w or 'N/A'}W x {engine.dimensions_h or 'N/A'}H inches
    - Weight: {engine.weight or 'N/A'} lbs
    - Fuel Requirements: {engine.fuel_pressure_psi or 'N/A'} psi, {engine.fuel_flow_lph or 'N/A'} lph
    - Cooling Requirement: {engine.cooling_btu_min or 'N/A'} BTU/min
    - Power: {engine.power_hp or 'N/A'} hp / {engine.torque_lb_ft or 'N/A'} lb-ft
"""

        transmission_info = "None selected"
        if transmission:
            transmission_info = f"{transmission.make} {transmission.model}"
            if transmission.bellhousing_pattern:
                transmission_info += f" (Pattern: {transmission.bellhousing_pattern})"

        collision_info = "No collisions detected"
        if build.collision_data:
            collision_info = str(build.collision_data)

        return f"""You are SwapSpec's AI Build Advisor, an expert assistant for engine swap projects.

Current Build Context:
- Vehicle: {vehicle_info}
- Engine: {engine_info}
- Transmission: {transmission_info}
- Build Status: {build.status.value}
- Current Collisions: {collision_info}
{engine_specs}

Your role:
1. Provide specific, actionable advice based on the build context and specifications
2. Help users understand fitment challenges and solutions
3. Recommend compatible parts and modifications
4. Explain technical concepts in accessible terms
5. Always cite the source of technical specifications when applicable

Guidelines:
- Be concise but thorough
- Include safety disclaimers for critical modifications
- Suggest professional consultation for complex fabrication
- Reference specific measurements and specifications when available
- If you don't have specific data, say so and provide general guidance"""

    def _extract_sources(
        self,
        engine: Optional[Engine],
        vehicle: Optional[Vehicle],
        transmission: Optional[Transmission],
    ) -> list[str]:
        sources = []
        if engine:
            sources.append(f"Engine specs: {engine.make} {engine.model}")
        if vehicle:
            sources.append(f"Vehicle data: {vehicle.year} {vehicle.make} {vehicle.model}")
        if transmission:
            sources.append(f"Transmission specs: {transmission.make} {transmission.model}")
        return sources

    def _mock_response(
        self,
        message: str,
        engine: Optional[Engine],
        vehicle: Optional[Vehicle],
    ) -> str:
        engine_name = f"{engine.make} {engine.model}" if engine else "selected engine"
        vehicle_name = f"{vehicle.year} {vehicle.make} {vehicle.model}" if vehicle else "your vehicle"
        return f"""Based on your {engine_name} swap into the {vehicle_name}, here are some considerations:

1. **Fitment**: Check engine bay clearance against the engine dimensions
2. **Fuel System**: Ensure your fuel pump can deliver adequate pressure and flow
3. **Cooling**: Size your radiator appropriately for the engine's heat output
4. **Transmission**: Verify bellhousing pattern compatibility

Note: This is a mock response. Configure ANTHROPIC_API_KEY for full AI advisor functionality."""
