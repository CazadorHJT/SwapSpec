"""Vision extractor: uses Claude Haiku to extract text from diagram/image pages in CHARM manuals."""
from __future__ import annotations

import base64
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Section path substrings that indicate visual-only content worth vision-extracting
VISION_CATEGORIES = [
    "electrical diagram",
    "electrical diagrams",
    "system diagram",
    "system diagrams",
    "connector view",
    "connector views",
    "wiring diagram",
    "wiring diagrams",
    "circuit diagram",
    "circuit diagrams",
    "schematic",
    "schematics",
    "routing diagram",
    "routing diagrams",
]

_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB — skip larger images


def is_vision_category(section_path: str) -> bool:
    """Return True if the section path matches a diagram/visual category."""
    lpath = section_path.lower()
    return any(cat in lpath for cat in VISION_CATEGORIES)


class VisionExtractor:
    """Extract textual descriptions from technical diagram images using Claude Haiku vision."""

    def __init__(self) -> None:
        self._client = None
        api_key = os.environ.get("ANTHROPIC_API_KEY") or ""
        if api_key:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=api_key)
            except ImportError:
                logger.warning("anthropic package not installed — VisionExtractor disabled")

    def extract(
        self,
        image_path: Path,
        section_title: str,
        vehicle_str: str,
    ) -> Optional[str]:
        """
        Use Claude Haiku to extract text/description from a diagram image.

        Returns None if:
        - ANTHROPIC_API_KEY is not set
        - Image is larger than 5 MB
        - Image format is not PNG or JPEG
        - Any API error occurs
        """
        if self._client is None:
            return None

        suffix = image_path.suffix.lower()
        if suffix not in (".png", ".jpg", ".jpeg"):
            return None

        try:
            size = image_path.stat().st_size
        except OSError:
            return None

        if size > _MAX_IMAGE_BYTES:
            logger.debug("Skipping large image %s (%d bytes)", image_path, size)
            return None

        try:
            image_data = image_path.read_bytes()
        except OSError:
            return None

        media_type = "image/png" if suffix == ".png" else "image/jpeg"
        b64 = base64.standard_b64encode(image_data).decode("ascii")

        prompt = (
            f"This is a technical diagram from a {vehicle_str} factory service manual, "
            f"section: {section_title}.\n\n"
            "Please extract all visible text, labels, connector pin numbers, wire colors, "
            "component identifiers, torque values, and any other technical data shown in "
            "this diagram. Format the output as a structured text description that would "
            "be useful for a mechanic searching for wiring or specification information. "
            "If the image is blank or unreadable, reply with only: [NO EXTRACTABLE CONTENT]"
        )

        try:
            response = self._client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": b64,
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
            )
            text = response.content[0].text.strip()
            if text == "[NO EXTRACTABLE CONTENT]" or not text:
                return None
            return text
        except Exception as exc:
            logger.warning("Vision extraction failed for %s: %s", image_path, exc)
            return None
