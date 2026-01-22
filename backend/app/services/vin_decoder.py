import httpx
from typing import Optional
from app.schemas.vehicle import VINDecodeResponse


class VINDecoderService:
    """Service for decoding VINs using NHTSA's free API."""

    NHTSA_API_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevin"

    async def decode(self, vin: str) -> VINDecodeResponse:
        """Decode a VIN using NHTSA's API."""
        if len(vin) != 17:
            return VINDecodeResponse(raw_data={"error": "VIN must be 17 characters"})

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.NHTSA_API_URL}/{vin}",
                    params={"format": "json"},
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()

                # Parse NHTSA response
                results = data.get("Results", [])
                parsed = self._parse_results(results)
                return VINDecodeResponse(
                    year=parsed.get("year"),
                    make=parsed.get("make"),
                    model=parsed.get("model"),
                    trim=parsed.get("trim"),
                    engine=parsed.get("engine"),
                    raw_data=data,
                )
        except httpx.HTTPError as e:
            return VINDecodeResponse(raw_data={"error": f"API error: {str(e)}"})
        except Exception as e:
            return VINDecodeResponse(raw_data={"error": f"Decode error: {str(e)}"})

    def _parse_results(self, results: list) -> dict:
        """Parse NHTSA API results into structured data."""
        parsed = {}
        variable_mapping = {
            "Model Year": "year",
            "Make": "make",
            "Model": "model",
            "Trim": "trim",
            "Engine Model": "engine",
            "Displacement (L)": "displacement",
        }

        for item in results:
            variable = item.get("Variable", "")
            value = item.get("Value")
            if value and variable in variable_mapping:
                key = variable_mapping[variable]
                if key == "year" and value:
                    try:
                        parsed[key] = int(value)
                    except ValueError:
                        pass
                else:
                    parsed[key] = value

        return parsed

    def get_vin_pattern(self, vin: str) -> Optional[str]:
        """Extract VIN pattern for matching similar vehicles.

        Uses characters 1-3 (WMI), 4-8 (VDS) for pattern matching.
        """
        if len(vin) >= 11:
            return vin[:11]  # WMI + VDS + check digit + model year
        return None
