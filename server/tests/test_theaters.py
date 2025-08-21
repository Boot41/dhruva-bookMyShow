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

from server.routers import theaters


class FakeTheater:
    def __init__(self, id: int, name: str, address: str, city_id: int, amenities: list[str] | None = None,
                 is_active: bool = True):
        self.id = id
        self.name = name
        self.address = address
        self.city_id = city_id
        self.amenities = amenities or []
        self.is_active = is_active


class FakeQuery:
    def __init__(self, data: list[FakeTheater]):
        self._data = list(data)

    # SQLAlchemy-like chainable no-ops for this router logic
    def join(self, *args, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        # We do not parse SQLAlchemy expressions in this fake.
        # Tests seed or pre-filter the data using FakeSession.
        return self

    def distinct(self, *args, **kwargs):
        return self

    def all(self):
        return list(self._data)


class FakeSession:
    def __init__(self):
        self._theaters: list[FakeTheater] = []
        # The tests may set this to emulate filtering by city_id inside query()
        self.current_city_id: int | None = None

    def query(self, model):
        # Only Theater is used in this router
        if model.__name__ == "Theater":
            data = self._theaters
            # Emulate the city + is_active filter using test-provided context
            if self.current_city_id is not None:
                data = [t for t in data if t.city_id == self.current_city_id and t.is_active]
            return FakeQuery(data)
        return FakeQuery([])


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

    app.include_router(theaters.router)

    with TestClient(app) as client:
        client.fake_db = fake_db  # type: ignore[attr-defined]
        yield client


def test_list_theaters_requires_city_id(test_app_client: TestClient):
    r = test_app_client.get("/theaters")
    assert r.status_code == 422  # Missing required query param


def test_list_theaters_by_city_only_active(test_app_client: TestClient):
    fake_db = test_app_client.fake_db  # type: ignore[attr-defined]
    fake_db._theaters.append(FakeTheater(id=1, name="T1", address="Addr1", city_id=1, is_active=True))
    fake_db._theaters.append(FakeTheater(id=2, name="T2", address="Addr2", city_id=1, is_active=False))
    fake_db._theaters.append(FakeTheater(id=3, name="T3", address="Addr3", city_id=2, is_active=True))

    # Emulate the router's filter(Theater.city_id == 1, Theater.is_active == True)
    fake_db.current_city_id = 1

    r = test_app_client.get("/theaters", params={"city_id": 1})
    assert r.status_code == 200
    data = r.json()
    assert [t["id"] for t in data] == [1]
    assert data[0]["name"] == "T1"


def test_list_theaters_filtered_by_movie_id(test_app_client: TestClient):
    fake_db = test_app_client.fake_db  # type: ignore[attr-defined]
    # Seed three active theaters in the same city
    t1 = FakeTheater(id=10, name="Alpha", address="A", city_id=1, is_active=True)
    t2 = FakeTheater(id=20, name="Beta", address="B", city_id=1, is_active=True)
    t3 = FakeTheater(id=30, name="Gamma", address="C", city_id=1, is_active=True)
    fake_db._theaters.extend([t1, t2, t3])

    # City filter emulation
    fake_db.current_city_id = 1

    # We want the join+filter chain (by movie_id) to return only t1 and t2
    theaters_with_movie = [t1, t2]

    # Monkeypatch query() to wrap the chain and force the final all() to return the subset
    orig_query = fake_db.query

    def query_with_movie_filter(model):
        q = orig_query(model)
        if model.__name__ == "Theater":
            class QueryWrapper:
                def __init__(self, inner):
                    self.inner = inner
                def join(self, *a, **k):
                    self.inner.join(*a, **k)
                    return self
                def filter(self, *a, **k):
                    self.inner.filter(*a, **k)
                    return self
                def distinct(self, *a, **k):
                    self.inner.distinct(*a, **k)
                    return self
                def all(self):
                    return list(theaters_with_movie)
            return QueryWrapper(q)
        return q

    fake_db.query = query_with_movie_filter  # type: ignore[assignment]

    r = test_app_client.get("/theaters", params={"city_id": 1, "movie_id": 999})
    assert r.status_code == 200
    data = r.json()
    assert [t["id"] for t in data] == [10, 20]
    assert {t["name"] for t in data} == {"Alpha", "Beta"}
