import os
import sys
from pathlib import Path
import tempfile
import os as _os
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, time

# Ensure the app uses SQLite for import-time engine creation
os.environ.setdefault("BMS_DATABASE_URL", "sqlite+pysqlite:///:memory:")

# Make `server/app` resolvable as top-level `app` when importing routers
SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from server.routers import bookings
from app.db import get_db
from app.models import Base, Show, Booking


@pytest.fixture()
def test_app_client():
    # Build a fresh file DB per test
    db_path = Path(tempfile.gettempdir()) / "bookings_test.db"
    if db_path.exists():
        db_path.unlink()

    sqlalchemy_url = f"sqlite+pysqlite:///{db_path}"
    test_engine = create_engine(sqlalchemy_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Create only the tables we need to avoid dialect issues (e.g., JSONB on SQLite)
    Base.metadata.create_all(bind=test_engine, tables=[Show.__table__, Booking.__table__])

    # Seed a sample show
    with TestingSessionLocal() as db:
        show = Show(
            id=1,
            movie_id=1,       # referenced table not created; fine for SQLite in tests
            screen_id=1,
            show_date=date(2025, 1, 1),
            show_time=time(18, 30, 0),
            base_price=250.00,
            available_seats=100,
        )
        db.add(show)
        db.commit()

    app = FastAPI()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(bookings.router)

    with TestClient(app) as client:
        yield client

    # Cleanup the database file between tests
    try:
        db_path.unlink()
    except FileNotFoundError:
        pass


def booking_payload(**overrides):
    payload = {
        "show_id": 1,
        "seat_numbers": [1, 2, 3],
        "user_id": 42,
    }
    payload.update(overrides)
    return payload


def test_create_booking_success(test_app_client: TestClient):
    r = test_app_client.post("/bookings", json=booking_payload())
    assert r.status_code == 201, r.text
    data = r.json()
    # Expected amount = base_price * unique seats
    assert data["show_id"] == 1
    assert data["user_id"] == 42
    assert data["final_amount"] == 250.0 * 3
    assert data["booking_status"] == "pending_payment"
    assert data["booking_reference"].startswith("BMS-")


def test_create_booking_invalid_show(test_app_client: TestClient):
    r = test_app_client.post("/bookings", json=booking_payload(show_id=999))
    assert r.status_code == 404
    assert r.json().get("detail") == "Show not found"


def test_create_booking_invalid_seats(test_app_client: TestClient):
    # Empty list
    r1 = test_app_client.post("/bookings", json=booking_payload(seat_numbers=[]))
    assert r1.status_code == 400
    assert r1.json().get("detail") == "Invalid seat numbers"

    # Negative or zero
    r2 = test_app_client.post("/bookings", json=booking_payload(seat_numbers=[0, -1]))
    assert r2.status_code == 400
    assert r2.json().get("detail") == "Invalid seat numbers"


def test_list_bookings_all_and_filter_by_user(test_app_client: TestClient):
    # Create two bookings with different users
    test_app_client.post("/bookings", json=booking_payload(user_id=1, seat_numbers=[1]))
    test_app_client.post("/bookings", json=booking_payload(user_id=2, seat_numbers=[2, 3]))

    # List all
    r_all = test_app_client.get("/bookings")
    assert r_all.status_code == 200
    all_list = r_all.json()
    assert len(all_list) == 2

    # Filter by user_id=1
    r_u1 = test_app_client.get("/bookings", params={"user_id": 1})
    assert r_u1.status_code == 200
    u1_list = r_u1.json()
    assert len(u1_list) == 1
    assert u1_list[0]["user_id"] == 1
