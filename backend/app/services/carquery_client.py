"""
CarQuery API client for looking up vehicle and engine specifications.
Free API, no authentication required.
Docs: https://www.carqueryapi.com/documentation/api-usage/
"""
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class CarQueryClient:
    BASE_URL = "https://www.carqueryapi.com/api/0.3/"

    async def get_trims(self, make: str, model: str, year: int) -> list[dict]:
        """Search for matching trims to find model_id."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.BASE_URL,
                    params={
                        "cmd": "getTrims",
                        "make": make,
                        "model": model,
                        "year": str(year),
                    },
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()
                return data.get("Trims", [])
        except Exception as e:
            logger.warning(f"CarQuery getTrims failed: {e}")
            return []

    async def get_model(self, model_id: int) -> Optional[dict]:
        """Get full specs for a specific model_id."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.BASE_URL,
                    params={"cmd": "getModel", "model": str(model_id)},
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()
                return data.get("model_id") and data or None
        except Exception as e:
            logger.warning(f"CarQuery getModel failed: {e}")
            return None

    async def search_engine_specs(
        self, make: str, model: str, year: int, trim: Optional[str] = None
    ) -> Optional[dict]:
        """Search for trims and return normalized specs from the best match."""
        trims = await self.get_trims(make, model, year)
        if not trims:
            return None

        # Try to match trim if specified
        best = None
        if trim:
            trim_lower = trim.lower()
            for t in trims:
                if trim_lower in (t.get("model_trim", "") or "").lower():
                    best = t
                    break

        if not best:
            best = trims[0]

        return self._normalize_trim(best)

    async def search_vehicle_specs(
        self, make: str, model: str, year: int, trim: Optional[str] = None
    ) -> Optional[dict]:
        """Search for vehicle-level specs (weight, dimensions)."""
        trims = await self.get_trims(make, model, year)
        if not trims:
            return None

        best = None
        if trim:
            trim_lower = trim.lower()
            for t in trims:
                if trim_lower in (t.get("model_trim", "") or "").lower():
                    best = t
                    break

        if not best:
            best = trims[0]

        return self._normalize_vehicle(best)

    def _normalize_trim(self, trim_data: dict) -> dict:
        """Normalize CarQuery trim data to our engine field names."""
        specs = {}

        # Displacement
        disp = self._safe_float(trim_data.get("model_engine_cc"))
        if disp:
            specs["displacement_liters"] = round(disp / 1000.0, 1)

        # Compression ratio
        cr = self._safe_float(trim_data.get("model_engine_compression"))
        if cr:
            specs["compression_ratio"] = cr

        # Bore / stroke
        bore = self._safe_float(trim_data.get("model_engine_bore_mm"))
        if bore:
            specs["bore_mm"] = bore

        stroke = self._safe_float(trim_data.get("model_engine_stroke_mm"))
        if stroke:
            specs["stroke_mm"] = stroke

        # Power
        hp = self._safe_float(trim_data.get("model_engine_power_ps"))
        if hp:
            # CarQuery reports PS (metric HP), convert to SAE HP
            specs["power_hp"] = int(round(hp * 0.9863))

        torque = self._safe_float(trim_data.get("model_engine_torque_nm"))
        if torque:
            specs["torque_lb_ft"] = int(round(torque * 0.7376))

        # Valve train inference from engine position + valves per cyl
        valves_per_cyl = self._safe_int(trim_data.get("model_engine_valves_per_cyl"))
        engine_type = (trim_data.get("model_engine_type") or "").upper()
        if "DOHC" in engine_type or valves_per_cyl == 4:
            specs["valve_train"] = "DOHC"
        elif "SOHC" in engine_type:
            specs["valve_train"] = "SOHC"
        elif "OHV" in engine_type or valves_per_cyl == 2:
            specs["valve_train"] = "OHV"

        # Redline guess from power RPM
        power_rpm = self._safe_int(trim_data.get("model_engine_power_rpm"))
        if power_rpm:
            specs["redline_rpm"] = power_rpm + 500

        # Transmission type
        trans = trim_data.get("model_transmission_type", "")
        if trans:
            specs["trans_type"] = trans

        return specs

    def _normalize_vehicle(self, trim_data: dict) -> dict:
        """Normalize CarQuery trim data to our vehicle field names."""
        specs = {}

        weight_kg = self._safe_float(trim_data.get("model_weight_kg"))
        if weight_kg:
            specs["curb_weight_lbs"] = int(round(weight_kg * 2.20462))

        return specs

    @staticmethod
    def _safe_float(val) -> Optional[float]:
        if val is None or val == "" or val == "0":
            return None
        try:
            f = float(val)
            return f if f > 0 else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _safe_int(val) -> Optional[int]:
        if val is None or val == "" or val == "0":
            return None
        try:
            i = int(float(val))
            return i if i > 0 else None
        except (ValueError, TypeError):
            return None
