import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from app.config import get_settings

settings = get_settings()


class StorageService:
    def __init__(self):
        self.storage_path = Path(settings.storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

    async def save_file(self, file: UploadFile, subfolder: str = "") -> str:
        """Save uploaded file and return the relative path."""
        # Generate unique filename
        ext = Path(file.filename).suffix if file.filename else ".bin"
        unique_name = f"{uuid.uuid4()}{ext}"

        # Create subfolder if specified
        save_dir = self.storage_path / subfolder if subfolder else self.storage_path
        save_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = save_dir / unique_name
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Return relative path for URL generation
        if subfolder:
            return f"{subfolder}/{unique_name}"
        return unique_name

    def get_file_path(self, relative_path: str) -> Path:
        """Get absolute path for a stored file."""
        return self.storage_path / relative_path

    def file_exists(self, relative_path: str) -> bool:
        """Check if file exists in storage."""
        return (self.storage_path / relative_path).exists()

    def delete_file(self, relative_path: str) -> bool:
        """Delete a file from storage."""
        file_path = self.storage_path / relative_path
        if file_path.exists():
            os.remove(file_path)
            return True
        return False

    def get_url(self, relative_path: str) -> str:
        """Generate URL for accessing a stored file."""
        return f"/api/files/{relative_path}"
