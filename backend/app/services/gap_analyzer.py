from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal


# Critical specification paths to check relative to the manual root directory.
# Values are partial paths — we check if any file/dir under manual_dir starts with the path.
CRITICAL_CHECKS = {
    "general_engine_specs": "Repair and Diagnosis/Engine, Cooling and Exhaust/Engine/Specifications/Mechanical Specifications/General Engine Specifications",
    "engine_mount_specs": "Repair and Diagnosis/Engine, Cooling and Exhaust/Engine/Drive Belts, Mounts, Brackets and Accessories/Engine Mount/Specifications",
    "ecu_wiring_pt1": "Repair and Diagnosis/Diagrams/Electrical Diagrams/Powertrain Management/Computers and Control Systems/System Diagram",
    "connector_views": "Repair and Diagnosis/Diagrams/Connector Views/Powertrain Management",
    "fuel_injector_specs": "Repair and Diagnosis/Engine, Cooling and Exhaust/Engine/Fuel System/Fuel Injector/Specifications",
    "fuel_pressure_specs": "Repair and Diagnosis/Engine, Cooling and Exhaust/Engine/Fuel System/Fuel Pressure",
    "thermostat_specs": "Repair and Diagnosis/Engine, Cooling and Exhaust/Engine/Cooling System/Thermostat/Specifications",
    "transmission_specs": "Repair and Diagnosis/Transmission and Drivetrain",
    "transfer_case": "Repair and Diagnosis/Transmission and Drivetrain/Transfer Case",
    "oxygen_sensor_specs": "Repair and Diagnosis/Engine, Cooling and Exhaust/Engine/Engine Controls and Fuel System/Oxygen Sensor/Specifications",
}


@dataclass
class GapReport:
    present: list[str] = field(default_factory=list)   # check keys found and valid
    missing: list[str] = field(default_factory=list)    # check keys whose paths don't exist
    broken: list[str] = field(default_factory=list)     # files containing "Error parsing"


class GapAnalyzer:
    def analyze(self, manual_dir: Path, make: str, model: str, year: int) -> GapReport:
        report = GapReport()
        for key, path_fragment in CRITICAL_CHECKS.items():
            result = self._check_path(manual_dir, path_fragment)
            if result == "present":
                report.present.append(key)
            elif result == "broken":
                report.broken.append(key)
            else:
                report.missing.append(key)
        return report

    def _check_path(
        self, manual_dir: Path, path_fragment: str
    ) -> Literal["present", "missing", "broken"]:
        """Check whether the path_fragment exists under manual_dir.

        Handles partial path matching (checks if any file/dir starts with fragment).
        """
        # Normalise separators and try direct path first
        candidate = manual_dir / path_fragment
        if candidate.exists():
            # Check for "Error parsing" in any HTML under this path
            if self._has_error(candidate):
                return "broken"
            return "present"

        # Glob for a partial match anywhere in the tree
        # Convert fragment separators to check directory structure
        parts = [p for p in path_fragment.replace("\\", "/").split("/") if p]
        if not parts:
            return "missing"

        last_part = parts[-1]
        for match in manual_dir.rglob(last_part):
            # Verify the full fragment appears in the relative path
            rel = str(match.relative_to(manual_dir)).replace("\\", "/")
            fragment_lower = path_fragment.lower().replace("\\", "/")
            if fragment_lower in rel.lower() or last_part.lower() in rel.lower():
                if self._has_error(match):
                    return "broken"
                return "present"

        return "missing"

    def _has_error(self, path: Path) -> bool:
        """Return True if any index.html under path contains 'Error parsing'."""
        if path.is_file():
            if path.suffix.lower() == ".html":
                try:
                    text = path.read_text(encoding="utf-8", errors="ignore")
                    return "Error parsing" in text
                except OSError:
                    return False
            return False

        for html_file in path.rglob("*.html"):
            try:
                text = html_file.read_text(encoding="utf-8", errors="ignore")
                if "Error parsing" in text:
                    return True
            except OSError:
                continue
        return False
