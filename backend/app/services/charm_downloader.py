import asyncio
import difflib
import re
import zipfile
from pathlib import Path
from typing import Optional
import httpx


class CharmDownloader:
    BASE = "https://charm.li"

    async def find_and_download(
        self,
        year: int,
        make: str,
        model: str,
        dest_dir: Path,
        drive_type: Optional[str] = None,
        cylinders: Optional[int] = None,
    ) -> Optional[Path]:
        """Find the best-matching vehicle variant and download its ZIP. Returns zip path or None."""
        variants = await self._fetch_year_index(make, year)
        if not variants:
            return None

        best = self._best_match(variants, model, drive_type=drive_type, cylinders=cylinders)
        if not best:
            return None

        await asyncio.sleep(1)
        return await self._download_zip(make, year, best, dest_dir)

    async def _fetch_year_index(self, make: str, year: int) -> list[str]:
        """Fetch the year index page and return the list of vehicle variant names."""
        url = f"{self.BASE}/{make}/{year}/"
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
            except httpx.HTTPError:
                return []

        # Parse variant links from HTML — links of the form /{make}/{year}/...
        import re
        prefix = f"/{make}/{year}/".lower()
        variants = []
        for match in re.finditer(r'href=["\']([^"\']+)["\']', resp.text, re.IGNORECASE):
            href = match.group(1)
            if href.lower().startswith(prefix):
                segment = href[len(prefix):].rstrip("/")
                if segment and "/" not in segment:
                    from urllib.parse import unquote
                    variants.append(unquote(segment))
        return list(dict.fromkeys(variants))  # deduplicate, preserve order

    def _best_match(
        self,
        variants: list[str],
        model: str,
        drive_type: Optional[str] = None,
        cylinders: Optional[int] = None,
    ) -> Optional[str]:
        """Fuzzy-match model against variant list. Returns best match or None."""
        # Try difflib against full variant names first
        matches = difflib.get_close_matches(model, variants, n=1, cutoff=0.4)
        if matches:
            return matches[0]

        # Extract model name part (strip engine specs like "L4-2.4L ...", "V6-3.0L ...")
        def extract_model_part(variant: str) -> str:
            return re.sub(r'\s+[LV]\d[-\s\d].*', '', variant, flags=re.IGNORECASE).strip()

        # Normalize: remove spaces/hyphens and lowercase for comparison
        def normalize(s: str) -> str:
            return s.lower().replace(' ', '').replace('-', '')

        model_norm = normalize(model)
        variant_parts = [(v, extract_model_part(v)) for v in variants]

        # Try difflib against extracted model parts (shorter = better ratio)
        model_parts = [vp[1] for vp in variant_parts]
        matches = difflib.get_close_matches(model, model_parts, n=1, cutoff=0.3)
        if matches:
            for full_v, part in variant_parts:
                if part == matches[0]:
                    return full_v

        # Normalize substring match (handles "4Runner" == "4 Runner", etc.)
        # Collect all candidates then pick highest-scoring one
        candidates = [full_v for full_v, part in variant_parts if model_norm in normalize(part)]
        if candidates:
            return max(candidates, key=lambda v: self._score_variant(v, drive_type, cylinders))

        # Last resort: plain substring match
        model_lower = model.lower()
        for v in variants:
            if model_lower in v.lower():
                return v

        return None

    def _score_variant(
        self, variant: str, drive_type: Optional[str], cylinders: Optional[int]
    ) -> int:
        """Score a variant higher if it matches known drivetrain/engine hints."""
        score = 0
        v_lower = variant.lower()
        if drive_type:
            # Normalize "4x4"/"4WD"/"four wheel" → "4wd"
            dt = drive_type.lower().replace("x", "").replace(" ", "")
            if dt in ("44", "4wd", "awd") and "4wd" in v_lower:
                score += 2
            elif dt in ("42", "2wd", "rwd", "fwd") and "2wd" in v_lower:
                score += 2
        if cylinders:
            cyl_tags = {4: ("l4", "i4", "4-cyl"), 6: ("l6", "v6", "i6", "6-cyl"), 8: ("v8", "8-cyl")}
            for tag in cyl_tags.get(cylinders, ()):
                if tag in v_lower:
                    score += 1
                    break
        return score

    async def _download_zip(
        self, make: str, year: int, variant: str, dest: Path
    ) -> Optional[Path]:
        """Download the ZIP for a variant. Streams to avoid loading entire file in memory."""
        from urllib.parse import quote
        encoded_variant = quote(variant, safe="")
        url = f"{self.BASE}/bundle/{make}/{year}/{encoded_variant}/"
        dest.mkdir(parents=True, exist_ok=True)
        zip_path = dest / f"{make}_{year}_{variant}.zip"

        async with httpx.AsyncClient(follow_redirects=True, timeout=300) as client:
            try:
                async with client.stream("GET", url) as resp:
                    resp.raise_for_status()
                    with open(zip_path, "wb") as f:
                        async for chunk in resp.aiter_bytes(chunk_size=65536):
                            f.write(chunk)
            except httpx.HTTPError:
                return None

        # Validate it's actually a ZIP
        if not zipfile.is_zipfile(zip_path):
            zip_path.unlink(missing_ok=True)
            return None

        return zip_path
