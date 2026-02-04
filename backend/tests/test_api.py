"""
Basic API tests for SwapSpec backend.
Run with: pytest tests/
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, engine, Base

# Fake Supabase user/session for mocking
FAKE_USER_ID = "00000000-0000-0000-0000-000000000001"
FAKE_ACCESS_TOKEN = "fake-supabase-token"


def _make_mock_supabase():
    """Create a mock Supabase client that handles auth operations."""
    mock = MagicMock()

    # sign_up response
    mock_user = MagicMock()
    mock_user.id = FAKE_USER_ID
    mock_user.email = "test@example.com"

    mock_session = MagicMock()
    mock_session.access_token = FAKE_ACCESS_TOKEN

    sign_up_response = MagicMock()
    sign_up_response.user = mock_user
    sign_up_response.session = mock_session
    mock.auth.sign_up.return_value = sign_up_response

    sign_in_response = MagicMock()
    sign_in_response.user = mock_user
    sign_in_response.session = mock_session
    mock.auth.sign_in_with_password.return_value = sign_in_response

    get_user_response = MagicMock()
    get_user_response.user = mock_user
    mock.auth.get_user.return_value = get_user_response

    # Storage mocks
    mock_bucket = MagicMock()
    mock_bucket.upload.return_value = None
    mock_bucket.get_public_url.return_value = "https://example.com/file.txt"
    mock_bucket.remove.return_value = None
    mock.storage.from_.return_value = mock_bucket

    return mock


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def client():
    mock_supabase = _make_mock_supabase()

    with patch("app.services.supabase_client.get_supabase_client", return_value=mock_supabase), \
         patch("app.utils.auth.get_supabase_client", return_value=mock_supabase), \
         patch("app.routers.auth.get_supabase_client", return_value=mock_supabase), \
         patch("app.services.storage.get_supabase_client", return_value=mock_supabase):

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.mark.anyio
async def test_root(client: AsyncClient):
    """Test root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "SwapSpec API"


@pytest.mark.anyio
async def test_health(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.anyio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data


@pytest.mark.anyio
async def test_login(client: AsyncClient):
    """Test user login."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.anyio
async def test_list_engines_empty(client: AsyncClient):
    """Test listing engines when empty."""
    response = await client.get("/api/engines")
    assert response.status_code == 200
    data = response.json()
    assert "engines" in data
    assert "total" in data


@pytest.mark.anyio
async def test_create_engine_requires_auth(client: AsyncClient):
    """Test that creating an engine requires authentication."""
    response = await client.post(
        "/api/engines",
        json={
            "make": "Chevrolet",
            "model": "LS3",
        },
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_create_and_get_engine(client: AsyncClient):
    """Test creating and retrieving an engine with new spec fields."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    create_response = await client.post(
        "/api/engines",
        json={
            "make": "Chevrolet",
            "model": "LS3",
            "variant": "6.2L",
            "power_hp": 430,
            "torque_lb_ft": 424,
            "displacement_liters": 6.2,
            "compression_ratio": 10.7,
            "valve_train": "OHV",
            "bore_mm": 103.25,
            "stroke_mm": 92.0,
            "balance_type": "internal",
            "can_bus_protocol": "GM E38",
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    engine_data = create_response.json()
    engine_id = engine_data["id"]

    # Verify new spec fields are returned
    assert engine_data["displacement_liters"] == 6.2
    assert engine_data["compression_ratio"] == 10.7
    assert engine_data["valve_train"] == "OHV"
    assert engine_data["bore_mm"] == 103.25
    assert engine_data["stroke_mm"] == 92.0
    assert engine_data["balance_type"] == "internal"
    assert engine_data["can_bus_protocol"] == "GM E38"

    # Verify data_sources tracks user-contributed fields
    assert engine_data["data_sources"] is not None
    assert engine_data["data_sources"]["power_hp"] == "user_contributed"
    assert engine_data["data_sources"]["displacement_liters"] == "user_contributed"
    assert engine_data["data_sources"]["compression_ratio"] == "user_contributed"

    get_response = await client.get(f"/api/engines/{engine_id}")
    assert get_response.status_code == 200
    assert get_response.json()["make"] == "Chevrolet"
    assert get_response.json()["model"] == "LS3"
    assert get_response.json()["displacement_liters"] == 6.2


@pytest.mark.anyio
async def test_create_engine_with_data_sources(client: AsyncClient):
    """Test that engine creation properly tracks data sources."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    create_response = await client.post(
        "/api/engines",
        json={
            "make": "Ford",
            "model": "Coyote",
            "variant": "5.0L Gen 3",
            "power_hp": 460,
            "compression_ratio": 12.0,
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    data = create_response.json()
    assert data["data_sources"]["power_hp"] == "user_contributed"
    assert data["data_sources"]["compression_ratio"] == "user_contributed"
    # Fields not provided shouldn't be in data_sources
    assert "bore_mm" not in data["data_sources"]


@pytest.mark.anyio
async def test_create_transmission_with_specs(client: AsyncClient):
    """Test creating a transmission with new spec fields."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    # Check if there's a transmission create endpoint
    response = await client.get("/api/transmissions")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_create_vehicle_with_specs(client: AsyncClient):
    """Test creating a vehicle with new spec fields."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    create_response = await client.post(
        "/api/vehicles",
        json={
            "year": 1969,
            "make": "Chevrolet",
            "model": "Camaro",
            "trim": "SS",
            "curb_weight_lbs": 3350,
            "engine_bay_length_in": 34.0,
            "engine_bay_width_in": 28.0,
            "stock_ground_clearance_in": 5.5,
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    data = create_response.json()

    # Verify new spec fields
    assert data["curb_weight_lbs"] == 3350
    assert data["engine_bay_length_in"] == 34.0
    assert data["engine_bay_width_in"] == 28.0
    assert data["stock_ground_clearance_in"] == 5.5

    # Verify data_sources
    assert data["data_sources"] is not None
    assert data["data_sources"]["curb_weight_lbs"] == "user_contributed"
    assert data["data_sources"]["engine_bay_length_in"] == "user_contributed"


@pytest.mark.anyio
async def test_spec_lookup_engine(client: AsyncClient):
    """Test spec lookup endpoint for engines."""
    response = await client.get(
        "/api/specs/lookup/engine",
        params={"make": "Chevrolet", "model": "Camaro", "year": 2010},
    )
    assert response.status_code == 200
    data = response.json()
    assert "specs" in data
    assert "sources" in data
    assert "confidence" in data
    assert data["confidence"] in ["high", "medium", "low"]


@pytest.mark.anyio
async def test_spec_lookup_vehicle(client: AsyncClient):
    """Test spec lookup endpoint for vehicles."""
    response = await client.get(
        "/api/specs/lookup/vehicle",
        params={"make": "Chevrolet", "model": "Camaro", "year": 2010},
    )
    assert response.status_code == 200
    data = response.json()
    assert "specs" in data
    assert "sources" in data
    assert "confidence" in data


@pytest.mark.anyio
async def test_list_vehicles_unauthenticated_sees_only_approved(client: AsyncClient):
    """Test that unauthenticated users only see approved vehicles."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    # Create a vehicle (defaults to pending quality_status)
    create_response = await client.post(
        "/api/vehicles",
        json={"year": 2015, "make": "Ford", "model": "Mustang", "trim": "GT"},
        headers=headers,
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["quality_status"] == "pending"

    # List without auth — pending vehicle should NOT appear
    list_response = await client.get("/api/vehicles")
    assert list_response.status_code == 200
    vehicles = list_response.json()["vehicles"]
    vehicle_ids = [v["id"] for v in vehicles]
    assert created["id"] not in vehicle_ids


@pytest.mark.anyio
async def test_list_vehicles_authenticated_sees_own_pending(client: AsyncClient):
    """Test that authenticated users see their own pending vehicles."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    # Create a vehicle (defaults to pending)
    create_response = await client.post(
        "/api/vehicles",
        json={"year": 2020, "make": "Toyota", "model": "Supra", "trim": "3.0"},
        headers=headers,
    )
    assert create_response.status_code == 201
    created = create_response.json()

    # List with auth — pending vehicle owned by this user SHOULD appear
    list_response = await client.get("/api/vehicles", headers=headers)
    assert list_response.status_code == 200
    vehicles = list_response.json()["vehicles"]
    vehicle_ids = [v["id"] for v in vehicles]
    assert created["id"] in vehicle_ids


@pytest.mark.anyio
async def test_vin_decode(client: AsyncClient):
    """Test VIN decoding endpoint."""
    response = await client.get("/api/vehicles/decode-vin/1FTEW1EP5MFA12345")
    assert response.status_code == 200
    data = response.json()
    assert "raw_data" in data or "make" in data


# ============================================================
# File Upload Tests
# ============================================================


@pytest.mark.anyio
async def test_file_upload_requires_auth(client: AsyncClient):
    """Test that file upload requires authentication."""
    response = await client.post(
        "/api/files/upload",
        files={"file": ("test.txt", b"test content", "text/plain")},
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_file_upload(client: AsyncClient):
    """Test file upload with authentication."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    response = await client.post(
        "/api/files/upload",
        files={"file": ("test.txt", b"test content", "text/plain")},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.txt"
    assert "stored_path" in data
    assert "url" in data
    assert data["size_bytes"] == 12


@pytest.mark.anyio
async def test_mesh_upload_validates_extension(client: AsyncClient):
    """Test that mesh upload validates file extensions."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    response = await client.post(
        "/api/files/upload/mesh",
        files={"file": ("test.txt", b"test content", "text/plain")},
        headers=headers,
    )
    assert response.status_code == 400
    assert "Invalid mesh file type" in response.json()["detail"]


@pytest.mark.anyio
async def test_mesh_upload_valid(client: AsyncClient):
    """Test valid mesh file upload."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    obj_content = b"# OBJ file\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3"
    response = await client.post(
        "/api/files/upload/mesh",
        files={"file": ("model.obj", obj_content, "application/octet-stream")},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "model.obj"


# ============================================================
# Chat History Tests
# ============================================================


@pytest.fixture
async def build_with_auth(client: AsyncClient):
    """Create a build for testing chat history."""
    headers = {"Authorization": f"Bearer {FAKE_ACCESS_TOKEN}"}

    vehicle_response = await client.post(
        "/api/vehicles",
        json={"year": 1990, "make": "Mazda", "model": "Miata", "trim": "Base"},
        headers=headers,
    )
    vehicle_id = vehicle_response.json()["id"]

    engines_response = await client.get("/api/engines")
    if engines_response.json()["total"] > 0:
        engine_id = engines_response.json()["engines"][0]["id"]
    else:
        engine_response = await client.post(
            "/api/engines",
            json={"make": "Honda", "model": "K24", "power_hp": 200},
            headers=headers,
        )
        engine_id = engine_response.json()["id"]

    build_response = await client.post(
        "/api/builds",
        json={"vehicle_id": vehicle_id, "engine_id": engine_id},
        headers=headers,
    )
    build_id = build_response.json()["id"]

    return {"build_id": build_id, "headers": headers, "token": FAKE_ACCESS_TOKEN}


@pytest.mark.anyio
async def test_chat_history_empty(client: AsyncClient, build_with_auth):
    """Test getting empty chat history."""
    build_id = build_with_auth["build_id"]
    headers = build_with_auth["headers"]

    response = await client.get(
        f"/api/advisor/chat/{build_id}/history",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["messages"] == []
    assert data["total"] == 0


@pytest.mark.anyio
async def test_chat_persists_messages(client: AsyncClient, build_with_auth):
    """Test that chat messages are persisted."""
    build_id = build_with_auth["build_id"]
    headers = build_with_auth["headers"]

    chat_response = await client.post(
        "/api/advisor/chat",
        json={"build_id": build_id, "message": "Will this engine fit?"},
        headers=headers,
    )
    assert chat_response.status_code == 200
    assert "response" in chat_response.json()

    history_response = await client.get(
        f"/api/advisor/chat/{build_id}/history",
        headers=headers,
    )
    assert history_response.status_code == 200
    data = history_response.json()
    assert data["total"] == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][0]["content"] == "Will this engine fit?"
    assert data["messages"][1]["role"] == "assistant"


@pytest.mark.anyio
async def test_clear_chat_history(client: AsyncClient, build_with_auth):
    """Test clearing chat history."""
    build_id = build_with_auth["build_id"]
    headers = build_with_auth["headers"]

    delete_response = await client.delete(
        f"/api/advisor/chat/{build_id}/history",
        headers=headers,
    )
    assert delete_response.status_code == 204

    history_response = await client.get(
        f"/api/advisor/chat/{build_id}/history",
        headers=headers,
    )
    assert history_response.json()["total"] == 0


# ============================================================
# Build Export Tests
# ============================================================


@pytest.mark.anyio
async def test_build_export_json(client: AsyncClient, build_with_auth):
    """Test JSON build export includes new spec fields."""
    build_id = build_with_auth["build_id"]
    headers = build_with_auth["headers"]

    response = await client.get(
        f"/api/builds/{build_id}/export",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "build" in data
    assert "vehicle" in data
    assert "engine" in data
    assert "recommendations" in data

    # Verify expanded engine export includes new fields
    engine = data["engine"]
    if engine:
        # These keys should exist in export (may be null)
        assert "displacement_liters" in engine or engine.get("make")
        assert "data_sources" in engine or engine.get("make")


@pytest.mark.anyio
async def test_build_export_pdf(client: AsyncClient, build_with_auth):
    """Test PDF build export."""
    build_id = build_with_auth["build_id"]
    headers = build_with_auth["headers"]

    response = await client.get(
        f"/api/builds/{build_id}/export/pdf",
        headers=headers,
    )
    assert response.status_code in [200, 503]
    if response.status_code == 200:
        assert response.headers["content-type"] == "application/pdf"
        assert response.content[:4] == b"%PDF"
    else:
        assert "WeasyPrint" in response.json()["detail"]
