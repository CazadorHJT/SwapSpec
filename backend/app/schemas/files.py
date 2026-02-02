from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    """Response schema for file upload."""
    filename: str
    stored_path: str
    url: str
    size_bytes: int
