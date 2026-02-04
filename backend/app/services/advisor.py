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

# Source label mapping
SOURCE_LABELS = {
    "manufacturer": "MANUFACTURER",
    "carquery_api": "API",
    "nhtsa_api": "API",
    "user_contributed": "USER",
}


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

    def _format_spec(self, label: str, value, unit: str, source: Optional[str]) -> str:
        """Format a single spec line with source indicator."""
        if value is None:
            return f"  - {label}: DATA NOT AVAILABLE"
        source_label = SOURCE_LABELS.get(source, "UNKNOWN") if source else "UNKNOWN"
        return f"  - {label}: {value} {unit} [{source_label}]"

    def _get_source(self, data_sources: Optional[dict], field: str) -> Optional[str]:
        """Get the source type for a field."""
        if not data_sources:
            return None
        return data_sources.get(field)

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
        if engine:
            engine_info = f"{engine.make} {engine.model}"
            if engine.variant:
                engine_info += f" ({engine.variant})"

        transmission_info = "None selected"
        if transmission:
            transmission_info = f"{transmission.make} {transmission.model}"
            if transmission.bellhousing_pattern:
                transmission_info += f" (Pattern: {transmission.bellhousing_pattern})"

        # Build detailed spec sections
        engine_specs = self._build_engine_specs(engine)
        vehicle_specs = self._build_vehicle_specs(vehicle)
        transmission_specs = self._build_transmission_specs(transmission)

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

{vehicle_specs}

{transmission_specs}

═══════════════════════════════════════════
CRITICAL DATA INTEGRITY RULES
═══════════════════════════════════════════

1. ONLY use specs marked [API] or [MANUFACTURER] for calculations and recommendations.
   These are verified data from external APIs or OEM service manuals.

2. Specs marked [USER] are user-provided and not independently verified.
   Always flag these: "Note: This value is user-provided and has not been independently verified."

3. When a spec shows "DATA NOT AVAILABLE":
   - Say: "This specification is not available in the database."
   - Do NOT invent, estimate, or guess the value.
   - Do NOT use general knowledge to fill in missing specs.
   - Suggest the user add the data or use the Enrich feature.

4. If you must provide general guidance beyond stored data:
   - ALWAYS prefix with: "GENERAL GUIDANCE (not from stored data):"
   - Never present general knowledge as if it were stored/verified data.

5. When asked about a specific spec value, always include its source tag.
   Example: "The compression ratio is 10.7:1 [MANUFACTURER]"

═══════════════════════════════════════════

Your role:
1. Provide specific, actionable advice based on the build context and verified specifications
2. Help users understand fitment challenges and solutions
3. Recommend compatible parts and modifications
4. Explain technical concepts in accessible terms
5. Always cite the data source when referencing specifications

Guidelines:
- Be concise but thorough
- Include safety disclaimers for critical modifications
- Suggest professional consultation for complex fabrication
- Reference specific measurements and specifications when available
- Clearly distinguish between verified data and general guidance"""

    def _build_engine_specs(self, engine: Optional[Engine]) -> str:
        if not engine:
            return "ENGINE SPECIFICATIONS: No engine selected"

        ds = engine.data_sources or {}
        gs = self._get_source
        fs = self._format_spec

        lines = ["ENGINE SPECIFICATIONS:"]

        lines.append("\n  Internal:")
        lines.append(fs("Displacement", engine.displacement_liters, "L", gs(ds, "displacement_liters")))
        lines.append(fs("Compression Ratio", engine.compression_ratio, ":1", gs(ds, "compression_ratio")))
        lines.append(fs("Valve Train", engine.valve_train, "", gs(ds, "valve_train")))
        lines.append(fs("Bore", engine.bore_mm, "mm", gs(ds, "bore_mm")))
        lines.append(fs("Stroke", engine.stroke_mm, "mm", gs(ds, "stroke_mm")))
        lines.append(fs("Balance Type", engine.balance_type, "", gs(ds, "balance_type")))
        lines.append(fs("Redline", engine.redline_rpm, "RPM", gs(ds, "redline_rpm")))
        lines.append(fs("Idle", engine.idle_rpm, "RPM", gs(ds, "idle_rpm")))

        lines.append("\n  Camshaft:")
        lines.append(fs("Intake Lift", engine.cam_intake_lift_in, "in", gs(ds, "cam_intake_lift_in")))
        lines.append(fs("Exhaust Lift", engine.cam_exhaust_lift_in, "in", gs(ds, "cam_exhaust_lift_in")))
        lines.append(fs("Intake Duration", engine.cam_intake_duration_deg, "deg", gs(ds, "cam_intake_duration_deg")))
        lines.append(fs("Exhaust Duration", engine.cam_exhaust_duration_deg, "deg", gs(ds, "cam_exhaust_duration_deg")))

        lines.append("\n  Performance:")
        lines.append(fs("Power", engine.power_hp, "HP", gs(ds, "power_hp")))
        lines.append(fs("Torque", engine.torque_lb_ft, "lb-ft", gs(ds, "torque_lb_ft")))

        lines.append("\n  Dimensions:")
        lines.append(fs("Height", engine.dimensions_h, "in", gs(ds, "dimensions_h")))
        lines.append(fs("Width", engine.dimensions_w, "in", gs(ds, "dimensions_w")))
        lines.append(fs("Length", engine.dimensions_l, "in", gs(ds, "dimensions_l")))
        lines.append(fs("Weight", engine.weight, "lbs", gs(ds, "weight")))
        lines.append(fs("Oil Pan Depth", engine.oil_pan_depth_in, "in", gs(ds, "oil_pan_depth_in")))
        lines.append(fs("Oil Pan Type", engine.oil_pan_type, "", gs(ds, "oil_pan_type")))
        lines.append(fs("Front Accessory Drive Depth", engine.front_accessory_drive_depth_in, "in", gs(ds, "front_accessory_drive_depth_in")))

        lines.append("\n  Thermal:")
        lines.append(fs("Cooling System", engine.cooling_system_type, "", gs(ds, "cooling_system_type")))
        lines.append(fs("Thermostat Temp", engine.thermostat_temp_f, "°F", gs(ds, "thermostat_temp_f")))
        lines.append(fs("Cooling BTU/min", engine.cooling_btu_min, "BTU/min", gs(ds, "cooling_btu_min")))
        lines.append(fs("Exhaust Port Shape", engine.exhaust_port_shape, "", gs(ds, "exhaust_port_shape")))
        lines.append(fs("Header Primary OD", engine.exhaust_header_primary_od_in, "in", gs(ds, "exhaust_header_primary_od_in")))
        lines.append(fs("Recommended Radiator Rows", engine.recommended_radiator_rows, "", gs(ds, "recommended_radiator_rows")))

        lines.append("\n  Fuel System:")
        lines.append(fs("Fuel Pressure", engine.fuel_pressure_psi, "psi", gs(ds, "fuel_pressure_psi")))
        lines.append(fs("Fuel Flow", engine.fuel_flow_lph, "lph", gs(ds, "fuel_flow_lph")))

        lines.append("\n  Electronics:")
        lines.append(fs("CAN Bus Protocol", engine.can_bus_protocol, "", gs(ds, "can_bus_protocol")))
        lines.append(fs("ECU Type", engine.ecu_type, "", gs(ds, "ecu_type")))
        lines.append(fs("Starter Position", engine.starter_position, "", gs(ds, "starter_position")))
        lines.append(fs("Distributor Type", engine.distributor_type, "", gs(ds, "distributor_type")))

        if engine.data_source_notes:
            lines.append(f"\n  Data Notes: {engine.data_source_notes}")

        return "\n".join(lines)

    def _build_vehicle_specs(self, vehicle: Optional[Vehicle]) -> str:
        if not vehicle:
            return "VEHICLE SPECIFICATIONS: No vehicle selected"

        ds = vehicle.data_sources or {}
        gs = self._get_source
        fs = self._format_spec

        lines = ["VEHICLE SPECIFICATIONS:"]

        lines.append("\n  Engine Bay:")
        lines.append(fs("Bay Length", vehicle.engine_bay_length_in, "in", gs(ds, "engine_bay_length_in")))
        lines.append(fs("Bay Width", vehicle.engine_bay_width_in, "in", gs(ds, "engine_bay_width_in")))
        lines.append(fs("Bay Height", vehicle.engine_bay_height_in, "in", gs(ds, "engine_bay_height_in")))
        lines.append(fs("Firewall to Radiator", vehicle.firewall_to_radiator_in, "in", gs(ds, "firewall_to_radiator_in")))

        lines.append("\n  Drivetrain:")
        lines.append(fs("Driveline Angle", vehicle.driveline_angle_deg, "deg", gs(ds, "driveline_angle_deg")))
        lines.append(fs("Trans Tunnel Width", vehicle.transmission_tunnel_width_in, "in", gs(ds, "transmission_tunnel_width_in")))
        lines.append(fs("Trans Tunnel Height", vehicle.transmission_tunnel_height_in, "in", gs(ds, "transmission_tunnel_height_in")))

        lines.append("\n  Weight/Chassis:")
        lines.append(fs("Curb Weight", vehicle.curb_weight_lbs, "lbs", gs(ds, "curb_weight_lbs")))
        lines.append(fs("Weight Dist. Front", vehicle.stock_weight_distribution_front_pct, "%", gs(ds, "stock_weight_distribution_front_pct")))
        lines.append(fs("Ground Clearance", vehicle.stock_ground_clearance_in, "in", gs(ds, "stock_ground_clearance_in")))

        lines.append("\n  Steering:")
        lines.append(fs("Steering Type", vehicle.steering_type, "", gs(ds, "steering_type")))
        if vehicle.steering_clearance_notes:
            lines.append(f"  - Steering Notes: {vehicle.steering_clearance_notes}")

        if vehicle.data_source_notes:
            lines.append(f"\n  Data Notes: {vehicle.data_source_notes}")

        return "\n".join(lines)

    def _build_transmission_specs(self, transmission: Optional[Transmission]) -> str:
        if not transmission:
            return "TRANSMISSION SPECIFICATIONS: No transmission selected"

        ds = transmission.data_sources or {}
        gs = self._get_source
        fs = self._format_spec

        lines = ["TRANSMISSION SPECIFICATIONS:"]

        lines.append(fs("Type", transmission.trans_type, "", gs(ds, "trans_type")))
        lines.append(fs("Gear Count", transmission.gear_count, "", gs(ds, "gear_count")))
        lines.append(fs("Bellhousing Pattern", transmission.bellhousing_pattern, "", gs(ds, "bellhousing_pattern")))
        lines.append(fs("Max Torque Capacity", transmission.max_torque_capacity_lb_ft, "lb-ft", gs(ds, "max_torque_capacity_lb_ft")))
        lines.append(fs("Input Shaft Spline", transmission.input_shaft_spline, "", gs(ds, "input_shaft_spline")))
        lines.append(fs("Output Shaft Spline", transmission.output_shaft_spline, "", gs(ds, "output_shaft_spline")))
        lines.append(fs("Shift Linkage", transmission.shift_linkage_type, "", gs(ds, "shift_linkage_type")))
        lines.append(fs("Crossmember Drop", transmission.crossmember_drop_in, "in", gs(ds, "crossmember_drop_in")))
        lines.append(fs("Tailhousing Length", transmission.tailhousing_length_in, "in", gs(ds, "tailhousing_length_in")))
        lines.append(fs("Speedometer Drive", transmission.speedometer_drive, "", gs(ds, "speedometer_drive")))

        if transmission.gear_ratios:
            source = gs(ds, "gear_ratios")
            source_label = SOURCE_LABELS.get(source, "UNKNOWN") if source else "UNKNOWN"
            ratios_str = ", ".join(f"{k}: {v}" for k, v in transmission.gear_ratios.items())
            lines.append(f"  - Gear Ratios: {ratios_str} [{source_label}]")

        lines.append(fs("Dimensions (HxWxL)", f"{transmission.dimensions_h}x{transmission.dimensions_w}x{transmission.dimensions_l}" if transmission.dimensions_h else None, "in", None))
        lines.append(fs("Weight", transmission.weight, "lbs", gs(ds, "weight")))

        if transmission.data_source_notes:
            lines.append(f"\n  Data Notes: {transmission.data_source_notes}")

        return "\n".join(lines)

    def _extract_sources(
        self,
        engine: Optional[Engine],
        vehicle: Optional[Vehicle],
        transmission: Optional[Transmission],
    ) -> list[str]:
        sources = []
        if engine:
            note = f"Engine specs: {engine.make} {engine.model}"
            if engine.data_source_notes:
                note += f" — {engine.data_source_notes}"
            sources.append(note)
        if vehicle:
            note = f"Vehicle data: {vehicle.year} {vehicle.make} {vehicle.model}"
            if vehicle.data_source_notes:
                note += f" — {vehicle.data_source_notes}"
            sources.append(note)
        if transmission:
            note = f"Transmission specs: {transmission.make} {transmission.model}"
            if transmission.data_source_notes:
                note += f" — {transmission.data_source_notes}"
            sources.append(note)
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
