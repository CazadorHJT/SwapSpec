from pathlib import Path
from datetime import datetime, timezone
from jinja2 import Environment, FileSystemLoader
from app.schemas.build import BuildExport

# Try to import weasyprint, but handle missing system dependencies gracefully
_weasyprint_available = False
_weasyprint_error = None

try:
    from weasyprint import HTML
    _weasyprint_available = True
except OSError as e:
    _weasyprint_error = str(e)


class PDFService:
    def __init__(self):
        templates_path = Path(__file__).parent.parent / "templates"
        templates_path.mkdir(parents=True, exist_ok=True)
        self.env = Environment(loader=FileSystemLoader(str(templates_path)))

    @property
    def is_available(self) -> bool:
        """Check if PDF generation is available."""
        return _weasyprint_available

    async def generate_build_report(self, export_data: BuildExport) -> bytes:
        """Generate a PDF build report from export data."""
        if not _weasyprint_available:
            raise RuntimeError(
                f"PDF generation is not available. WeasyPrint system dependencies are missing. "
                f"Install them with: brew install cairo pango gdk-pixbuf libffi (macOS) or "
                f"apt-get install libcairo2 libpango-1.0-0 libgdk-pixbuf2.0-0 (Debian/Ubuntu). "
                f"Original error: {_weasyprint_error}"
            )

        template = self.env.get_template("build_report.html")

        # Prepare template context
        context = {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "build": export_data.build,
            "vehicle": export_data.vehicle,
            "engine": export_data.engine,
            "transmission": export_data.transmission,
            "recommendations": export_data.recommendations or [],
        }

        # Render HTML
        html_content = template.render(**context)

        # Convert to PDF
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
