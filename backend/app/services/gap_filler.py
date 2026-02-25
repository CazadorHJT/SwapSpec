from __future__ import annotations

import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.services.gap_analyzer import GapReport, CRITICAL_CHECKS

settings = get_settings()

# Map spec key → human-readable title for display in the generated HTML
SPEC_TITLES = {
    "general_engine_specs": "General Engine Specifications",
    "engine_mount_specs": "Engine Mount Specifications",
    "ecu_wiring_pt1": "ECU / Powertrain Management Wiring",
    "connector_views": "Connector Views – Powertrain Management",
    "fuel_injector_specs": "Fuel Injector Specifications",
    "fuel_pressure_specs": "Fuel Pressure Specifications",
    "thermostat_specs": "Thermostat Specifications",
    "transmission_specs": "Transmission Specifications",
    "transfer_case": "Transfer Case Specifications",
    "oxygen_sensor_specs": "Oxygen Sensor Specifications",
}


@dataclass
class FilledSpec:
    spec_name: str
    content_html: str       # HTML body content in Operation CHARM format
    relative_path: str      # where to write it (relative to manual_dir)
    confidence: str         # "high" | "medium" | "low"
    source_note: str


class GapFiller:
    def __init__(self):
        if settings.anthropic_api_key:
            import anthropic
            self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        else:
            self._client = None

    async def fill_gaps(
        self,
        manual_dir: Path,
        gap_report: GapReport,
        make: str,
        model: str,
        year: int,
    ) -> list[FilledSpec]:
        """Attempt to fill each missing/broken spec using Claude."""
        if not self._client:
            return []

        results: list[FilledSpec] = []
        keys_to_fill = gap_report.missing + gap_report.broken
        for spec_name in keys_to_fill:
            filled = await self._fill_one(spec_name, make, model, year)
            if filled:
                self._write_spec(manual_dir, filled)
                results.append(filled)
        return results

    async def _fill_one(
        self, spec_name: str, make: str, model: str, year: int
    ) -> Optional[FilledSpec]:
        title = SPEC_TITLES.get(spec_name, spec_name.replace("_", " ").title())
        vehicle_str = f"{year} {make} {model}"

        prompt = textwrap.dedent(f"""
            You are a vehicle specification extraction assistant.

            Extract ONLY numeric values explicitly stated in known factory specifications
            for the {vehicle_str} related to: {title}

            Return ONLY values that appear in official OEM service manuals or verified
            technical publications. Return null for any value not explicitly confirmed.
            Do NOT infer, estimate, or extrapolate values.

            Format your response as an HTML table with two columns: Specification | Value.
            Include units in the Value column. If no confirmed data is available for a
            given row, write "N/A".

            Begin the table with:
            <table>
              <tr><th>Specification</th><th>Value</th></tr>
            ...
            </table>
        """).strip()

        try:
            response = self._client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            body_html = response.content[0].text.strip()
        except Exception:
            return None

        # Determine confidence based on whether Claude found data
        if "N/A" in body_html and body_html.count("N/A") > 3:
            confidence = "low"
        elif "N/A" in body_html:
            confidence = "medium"
        else:
            confidence = "high"

        # Build path from CRITICAL_CHECKS entry
        rel_path_base = CRITICAL_CHECKS.get(spec_name, f"Gap Filled/{spec_name}")
        relative_path = rel_path_base + "/index.html"

        content_html = self._build_html(title, vehicle_str, rel_path_base, body_html)

        return FilledSpec(
            spec_name=spec_name,
            content_html=content_html,
            relative_path=relative_path,
            confidence=confidence,
            source_note=f"Gap-filled by Claude AI for {vehicle_str}. Not from OEM manual.",
        )

    def _write_spec(self, manual_dir: Path, filled: FilledSpec) -> None:
        """Write the filled spec HTML to the manual directory."""
        target = manual_dir / filled.relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(filled.content_html, encoding="utf-8")

    def _build_html(
        self, title: str, vehicle_str: str, rel_path: str, body_html: str
    ) -> str:
        """Wrap body HTML in a minimal Operation CHARM-compatible page."""
        return textwrap.dedent(f"""<!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>{title}</title>
            </head>
            <body>
              <h1>{title}</h1>
              <p class="vehicle">{vehicle_str}</p>
              <p class="gap-fill-notice">
                <strong>Note:</strong> This section was gap-filled by the SwapSpec AI
                because it was missing from the downloaded manual. Values should be
                verified against an official OEM source before use.
              </p>
              {body_html}
            </body>
            </html>
        """).strip()
