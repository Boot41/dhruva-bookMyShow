import os
import sys
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Ensure the app uses SQLite for any import-time engine creation
os.environ.setdefault("BMS_DATABASE_URL", "sqlite+pysqlite:///:memory:")

# Make `server/app` resolvable as top-level `app` when importing routers
SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from server.routers import cities, search, bookings  # noqa: E402
from app import schemas  # noqa: E402
from app.db import get_db  # noqa: E402


# ---------- Fakes ----------
class FakeQuery:
    def __init__(self, data):
        self._data = list(data)

    def filter(self, *a, **k):
        return self

    def order_by(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def all(self):
        return list(self._data)


class FakeSession:
    def __init__(self, cities_data=None, movies_data=None):
        self._cities = cities_data or []
        self._movies = movies_data or []

    def query(self, model):
        # Return city list for City queries and movie list for Movie queries
        name = getattr(model, "__name__", "")
        if name == "City":
            return FakeQuery(self._cities)
        if name == "Movie":
            return FakeQuery(self._movies)
        return FakeQuery([])

    # Used by dependency teardown
    def close(self):
        pass


@pytest.fixture()
def app_client_cities():
    app = FastAPI()

    # seed two fake cities (instances compatible with schemas)
    class CityObj:
        def __init__(self, id, name, state, country):
            self.id = id
            self.name = name
            self.state = state
            self.country = country

    fake_db = FakeSession(
        cities_data=[CityObj(1, "Mumbai", "MH", "IN"), CityObj(2, "Delhi", "DL", "IN")]
    )

    def override_get_db():
        try:
            yield fake_db
        finally:
            fake_db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(cities.router)

    with TestClient(app) as client:
        yield client


def test_list_cities_success(app_client_cities: TestClient):
    r = app_client_cities.get("/cities")
    assert r.status_code == 200
    data = r.json()
    assert [c["name"] for c in data] == ["Mumbai", "Delhi"]


@pytest.fixture()
def app_client_cities_error():
    app = FastAPI()

    class CityObj:
        def __init__(self, id, name, state, country):
            self.id = id
            self.name = name
            self.state = state
            self.country = country

    fake_db = FakeSession(cities_data=[CityObj(1, "X", "S", "C")])

    def override_get_db():
        try:
            yield fake_db
        finally:
            fake_db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(cities.router)

    # Monkeypatch the imported service function to raise and hit error branch
    def failing_service(db):
        raise RuntimeError("boom")

    original = cities.list_cities_svc
    cities.list_cities_svc = failing_service  # type: ignore[attr-defined]

    try:
        with TestClient(app) as client:
            yield client
    finally:
        # restore original to avoid cross-test pollution
        cities.list_cities_svc = original  # type: ignore[attr-defined]


@pytest.fixture()
def app_client_search_movies_only():
    app = FastAPI()

    # simple movie objects
    class MovieObj:
        def __init__(self, id, title):
            self.id = id
            self.title = title
            self.description = None
            self.duration_minutes = 120
            self.release_date = None
            self.language = "EN"
            self.genres = []
            self.poster_url = None

    movies_data = [MovieObj(1, "Inception"), MovieObj(2, "Inside Out"), MovieObj(3, "Avatar")]
    fake_db = FakeSession(movies_data=movies_data)

    def override_get_db():
        try:
            yield fake_db
        finally:
            fake_db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(search.router)

    with TestClient(app) as client:
        yield client


def test_search_movies_only_path(app_client_search_movies_only: TestClient):
    # do not pass city_id so theater query path is skipped
    r = app_client_search_movies_only.get("/search", params={"q": "in", "limit_movies": 2})
    assert r.status_code == 200
    body = r.json()
    assert "movies" in body and isinstance(body["movies"], list)
    # our FakeQuery ignores filters/limits but returns stable data
    titles = {m["title"] for m in body["movies"]}
    assert {"Inception", "Inside Out", "Avatar"} == titles


def test_list_cities_error_path_returns_500(app_client_cities_error: TestClient):
    r = app_client_cities_error.get("/cities")
    assert r.status_code == 500
    assert r.json().get("detail", "").startswith("Internal server error: ")


def test_get_db_generator_executes():
    # cover app/db.get_db yield/finally lines
    from app.db import get_db as real_get_db

    gen = real_get_db()
    db = next(gen)
    assert db is not None
    # run the finally block
    with pytest.raises(StopIteration):
        next(gen)
