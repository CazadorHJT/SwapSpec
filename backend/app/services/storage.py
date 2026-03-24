import uuid
from pathlib import Path
from fastapi import UploadFile
from app.config import get_settings
from app.services.supabase_client import get_supabase_client

settings = get_settings()


class StorageService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def save_file(self, file: UploadFile, bucket: str = "uploads") -> str:
        """Upload file to Supabase Storage and return the storage path."""
        ext = Path(file.filename).suffix if file.filename else ".bin"
        unique_name = f"{uuid.uuid4()}{ext}"

        content = await file.read()

        self.supabase.storage.from_(bucket).upload(
            path=unique_name,
            file=content,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )

        return unique_name

    def get_url(self, path: str, bucket: str = "uploads") -> str:
        """Get public URL for a stored file."""
        res = self.supabase.storage.from_(bucket).get_public_url(path)
        return res

    async def upload_bytes(
        self, path: str, data: bytes, content_type: str, bucket: str = "uploads"
    ) -> str:
        """Upload raw bytes to Supabase Storage. Returns public URL."""
        self.supabase.storage.from_(bucket).upload(
            path, data, {"content-type": content_type, "upsert": "true"}
        )
        return self.supabase.storage.from_(bucket).get_public_url(path)

    def file_exists(self, path: str, bucket: str = "uploads") -> bool:
        """Check if file exists in Supabase Storage."""
        try:
            self.supabase.storage.from_(bucket).list(path="", search=path)
            return True
        except Exception:
            return False

    def delete_file(self, path: str, bucket: str = "uploads") -> bool:
        """Delete a file from Supabase Storage."""
        try:
            self.supabase.storage.from_(bucket).remove([path])
            return True
        except Exception:
            return False
