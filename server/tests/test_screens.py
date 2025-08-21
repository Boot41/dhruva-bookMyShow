import os
import sys
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Ensure the app uses SQLite for import-time engine creation (but we use fakes here)
os.environ.setdefault("BMS_DATABASE_URL", "sqlite+pysqlite:///:memory:")

# Make `server/app` resolvable as top-level `app` when importing routers
SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from server.routers import screens


class FakeScreen:
    def __init__(self, id: int, theater_id: int, name: str = "Screen 1", screen_type: str | None = None,
                 total_seats: int = 100, layout_config: dict | None = None):
        self.id = id
        self.theater_id = theater_id
        self.name = name
        self.screen_type = screen_type
        self.total_seats = total_seats
        self.layout_config = layout_config or {"rows": 10, "cols": 10}


class FakeQuery:
    def __init__(self, data: list[FakeScreen]):
        self._data = list(data)

    def filter(self, *args, **kwargs):
        # We do not parse SQLAlchemy expressions in this fake.
        # Tests seed only relevant items to validate behavior.
        return self

    def all(self):
        return list(self._data)


class FakeSession:
    def __init__(self):
        self._screens: list[FakeScreen] = []

    def query(self, model):
        # Only Screen is used in router
        return FakeQuery(self._screens)

    def get(self, model, pk: int):
        for s in self._screens:
            if s.id == pk:
                return s
        return None


@pytest.fixture()
def test_app_client():
    app = FastAPI()
    fake_db = FakeSession()

    # Override DB dependency
    def override_get_db():
        try:
            yield fake_db
        finally:
            pass

    from app.db import get_db
    app.dependency_overrides[get_db] = override_get_db

    app.include_router(screens.router)

    with TestClient(app) as client:
        client.fake_db = fake_db  # type: ignore[attr-defined]
        yield client


def test_list_screens_for_theater_returns_seeded_screens(test_app_client: TestClient):
    fake_db = test_app_client.fake_db  # type: ignore[attr-defined]
    # Seed only theater_id=10 screens
    fake_db._screens.append(FakeScreen(id=1, theater_id=10, name="A"))
    fake_db._screens.append(FakeScreen(id=2, theater_id=10, name="B"))

    r = test_app_client.get("/theaters/10/screens")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    names = {s["name"] for s in data}
    assert names == {"A", "B"}


def test_get_screen_by_id_and_404(test_app_client: TestClient):
    fake_db = test_app_client.fake_db  # type: ignore[attr-defined]
    fake_db._screens.append(FakeScreen(id=100, theater_id=77, name="Main"))

    r_ok = test_app_client.get("/screens/100")
    assert r_ok.status_code == 200
    assert r_ok.json()["name"] == "Main"

    r_missing = test_app_client.get("/screens/9999")
    assert r_missing.status_code == 404
    assert r_missing.json().get("detail") == "Screen not found"
