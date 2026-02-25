import asyncio
import difflib
import zipfile
from pathlib import Path
from typing import Optional
import httpx


class CharmDownloader:
    BASE = "https://charm.li"

    async def find_and_download(
        self, year: int, make: str, model: str, dest_dir: Path
    ) -> Optional[Path]:
        """Find the best-matching vehicle variant and download its ZIP. Returns zip path or None."""
        variants = await self._fetch_year_index(make, year)
        if not variants:
            return None

        best = self._best_match(variants, model)
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

    def _best_match(self, variants: list[str], model: str) -> Optional[str]:
        """Fuzzy-match model against variant list. Returns best match or None."""
        matches = difflib.get_close_matches(model, variants, n=1, cutoff=0.4)
        if matches:
            return matches[0]
        # Fall back: substring match (case-insensitive)
        model_lower = model.lower()
        for v in variants:
            if model_lower in v.lower():
                return v
        return None

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
