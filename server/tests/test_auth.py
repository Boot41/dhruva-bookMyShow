import os
import sys
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import tempfile
from sqlalchemy.pool import StaticPool

# Ensure the app uses SQLite for import-time engine creation
os.environ.setdefault("BMS_DATABASE_URL", "sqlite+pysqlite:///:memory:")

# Make `server/app` resolvable as top-level `app` when importing routers
SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from server.routers import auth
from app.db import get_db
from app.models import Base, User
from app import security


@pytest.fixture()
def test_app_client():
    # Use a shared in-memory SQLite database for this test run
    test_engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Create only the tables we need
    Base.metadata.create_all(bind=test_engine, tables=[User.__table__])

    app = FastAPI()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(auth.router)

    with TestClient(app) as client:
        yield client

    # No file cleanup needed for in-memory DB


def register_payload(**overrides):
    payload = {
        "email": "alice@example.com",
        "phone": "1234567890",
        "password": "StrongPass1",
        "first_name": "Alice",
        "last_name": "Doe",
    }
    payload.update(overrides)
    return payload


def login_payload(email: str, password: str):
    return {"email": email, "password": password}


def test_register_success(test_app_client: TestClient):
    r = test_app_client.post("/auth/register", json=register_payload())
    assert r.status_code == 201, r.text
    data = r.json()
    assert set(["id", "email", "phone", "first_name", "last_name"]).issubset(data.keys())
    assert data["email"] == "alice@example.com"
    assert data["first_name"] == "Alice"
    assert data["last_name"] == "Doe"


def test_register_duplicate_email(test_app_client: TestClient):
    # First registration
    r1 = test_app_client.post("/auth/register", json=register_payload())
    assert r1.status_code == 201

    # Duplicate registration
    r2 = test_app_client.post("/auth/register", json=register_payload())
    assert r2.status_code == 400
    assert r2.json().get("detail") == "Email already registered"


# def test_login_success_and_token_me_flow(test_app_client: TestClient):
#     # Register a user
#     test_app_client.post("/auth/register", json=register_payload())

#     # Login
#     r = test_app_client.post(
#         "/auth/login", json=login_payload("alice@example.com", "StrongPass1")
#     )
#     assert r.status_code == 200, r.text
#     token_data = r.json()
#     assert "access_token" in token_data
#     assert token_data.get("token_type") == "bearer"

#     # Access /auth/me with token
#     headers = {"Authorization": f"Bearer {token_data['access_token']}"}
#     me = test_app_client.get("/auth/me", headers=headers)
#     assert me.status_code == 200, me.text
#     me_data = me.json()
#     assert me_data["email"] == "alice@example.com"


def test_login_invalid_email(test_app_client: TestClient):
    r = test_app_client.post(
        "/auth/login", json=login_payload("nouser@example.com", "whateverpass")
    )
    assert r.status_code == 401
    assert r.json().get("detail") == "Invalid credentials"


def test_login_wrong_password(test_app_client: TestClient):
    # Register
    test_app_client.post("/auth/register", json=register_payload())
    # Wrong password
    r = test_app_client.post(
        "/auth/login", json=login_payload("alice@example.com", "WrongPass")
    )
    assert r.status_code == 401
    assert r.json().get("detail") == "Invalid credentials"


def test_me_with_invalid_token(test_app_client: TestClient):
    headers = {"Authorization": "Bearer invalid.token.value"}
    r = test_app_client.get("/auth/me", headers=headers)
    assert r.status_code == 401
    assert r.json().get("detail") == "Invalid token"


def test_me_user_not_found(test_app_client: TestClient):
    # Create a token with a non-existent user id
    ghost_token = security.create_access_token(subject=999999)
    headers = {"Authorization": f"Bearer {ghost_token}"}
    r = test_app_client.get("/auth/me", headers=headers)
    assert r.status_code == 401
    assert r.json().get("detail") == "User not found"
