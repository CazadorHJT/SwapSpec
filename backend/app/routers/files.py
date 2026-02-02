from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.models.user import User
from app.schemas.files import FileUploadResponse
from app.services.storage import StorageService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/files", tags=["Files"])


def _get_storage():
    return StorageService()

# Allowed mesh file extensions
MESH_EXTENSIONS = {".obj", ".stl", ".fbx", ".gltf", ".glb"}


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a single file to Supabase Storage. Requires authentication."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    content = await file.read()
    size_bytes = len(content)
    await file.seek(0)

    storage = _get_storage()
    stored_path = await storage.save_file(file, bucket="uploads")
    url = storage.get_url(stored_path, bucket="uploads")

    return FileUploadResponse(
        filename=file.filename,
        stored_path=stored_path,
        url=url,
        size_bytes=size_bytes,
    )


@router.post("/upload/mesh", response_model=FileUploadResponse)
async def upload_mesh_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a mesh file (3D scan) to Supabase Storage. Requires authentication."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in MESH_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mesh file type. Allowed: {', '.join(MESH_EXTENSIONS)}",
        )

    content = await file.read()
    size_bytes = len(content)
    await file.seek(0)

    storage = _get_storage()
    stored_path = await storage.save_file(file, bucket="meshes")
    url = storage.get_url(stored_path, bucket="meshes")

    return FileUploadResponse(
        filename=file.filename,
        stored_path=stored_path,
        url=url,
        size_bytes=size_bytes,
    )


@router.delete("/{path:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    path: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a file by its path. Requires authentication."""
    storage = _get_storage()
    deleted = storage.delete_file(path)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or could not be deleted",
        )
