"""
Basic API tests for SwapSpec backend.
Run with: pytest tests/
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, engine, Base


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def client():
    # Initialize test database
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
        data={
            "username": "test@example.com",
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
    """Test creating and retrieving an engine."""
    # Login first
    login_response = await client.post(
        "/api/auth/login",
        data={
            "username": "test@example.com",
            "password": "testpassword123",
        },
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create engine
    create_response = await client.post(
        "/api/engines",
        json={
            "make": "Chevrolet",
            "model": "LS3",
            "variant": "6.2L",
            "power_hp": 430,
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    engine_data = create_response.json()
    engine_id = engine_data["id"]

    # Get engine
    get_response = await client.get(f"/api/engines/{engine_id}")
    assert get_response.status_code == 200
    assert get_response.json()["make"] == "Chevrolet"
    assert get_response.json()["model"] == "LS3"


@pytest.mark.anyio
async def test_vin_decode(client: AsyncClient):
    """Test VIN decoding endpoint."""
    # Using a sample VIN (Ford F-150)
    response = await client.get("/api/vehicles/decode-vin/1FTEW1EP5MFA12345")
    assert response.status_code == 200
    data = response.json()
    # The NHTSA API should return some data
    assert "raw_data" in data or "make" in data
