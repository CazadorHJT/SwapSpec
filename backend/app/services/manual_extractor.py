import os
import zipfile
from pathlib import Path
from urllib.parse import unquote


class ManualExtractor:
    def extract_and_clean(self, zip_path: Path, dest_dir: Path) -> Path:
        """Extract ZIP to dest_dir and rename all entries with URL-decoded names.

        Validates all members before extraction to block path traversal and symlinks.
        Returns the root extraction directory.
        """
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_resolved = dest_dir.resolve()

        with zipfile.ZipFile(zip_path, "r") as zf:
            # Validate every member before extracting anything
            for info in zf.infolist():
                # Block symlinks (Unix symlink mode = 0xA1ED)
                unix_mode = (info.external_attr >> 16) & 0xFFFF
                if unix_mode == 0xA1ED:
                    raise ValueError(f"ZIP contains symlink — rejected: {info.filename}")
                # Block path traversal
                member_path = (dest_dir / info.filename).resolve()
                if not str(member_path).startswith(str(dest_resolved) + os.sep) and \
                        str(member_path) != str(dest_resolved):
                    raise ValueError(f"ZIP path traversal detected: {info.filename}")
            zf.extractall(dest_dir)

        # Walk bottom-up so we rename children before parents
        for dirpath, dirnames, filenames in os.walk(dest_dir, topdown=False):
            current = Path(dirpath)

            # Rename files first
            for fname in filenames:
                decoded = self._decode_name(fname)
                if decoded != fname:
                    (current / fname).rename(current / decoded)

            # Then rename directories
            for dname in dirnames:
                decoded = self._decode_name(dname)
                if decoded != dname:
                    old_path = current / dname
                    new_path = current / decoded
                    if old_path.exists():
                        old_path.rename(new_path)

        return dest_dir

    def _decode_name(self, name: str) -> str:
        """URL-decode a filename/dirname and replace '/' with '-' for safety."""
        decoded = unquote(name)
        return decoded.replace("/", "-")
