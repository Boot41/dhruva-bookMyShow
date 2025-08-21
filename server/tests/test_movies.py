import os
import sys
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Ensure the app uses SQLite for import-time engine creation (not actually used here)
os.environ.setdefault("BMS_DATABASE_URL", "sqlite+pysqlite:///:memory:")

# Make `server/app` resolvable as top-level `app` when importing routers
SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from server.routers import movies
from app import schemas


class FakeUser:
    def __init__(self, user_id: int = 1):
        self.id = user_id
        self.email = "test@example.com"
        self.first_name = "Test"
        self.last_name = "User"


class FakeQuery:
    def __init__(self, model, data, mode: str = "default"):
        self.model = model
        self._data = list(data)
        self._mode = mode  # "default" or "playing"

    # SQLAlchemy-like chainable methods
    def join(self, *args, **kwargs):
        # If a join chain starts from Movie, treat this as the playing-movies query
        if self.model.__name__ == "Movie":
            self._mode = "playing"
        return self

    def filter(self, *args, **kwargs):
        # We don't parse expressions; just keep the mode
        return self

    def distinct(self, *args, **kwargs):
        return self

    def all(self):
        return list(self._data)

    def first(self):
        return self._data[0] if self._data else None


class FakeSession:
    def __init__(self):
        self._movies = []  # storage of Movie-like dicts
        self._playing_movies = []  # subset used for /movies/playing
        self._next_id = 1

    # API used by our router code
    def add(self, obj):
        # obj is a Movie ORM instance, but we only need its attributes
        # Emulate DB-generated id
        setattr(obj, "id", self._next_id)
        self._next_id += 1
        # Store a simple snapshot
        self._movies.append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        # Nothing extra to do; id already set in add
        pass

    def get(self, model, pk):
        if model.__name__ == "Movie":
            for m in self._movies:
                if getattr(m, "id", None) == pk:
                    return m
        return None

    def query(self, model):
        if model.__name__ == "Movie":
            # For plain list_movies, return all movies
            return FakeQuery(model, self._movies)
        # Should not be queried for other models in our tests
        return FakeQuery(model, [])

    # Test helpers
    def set_playing_movies(self, movies_list):
        # movies_list is a list of Movie-like instances
        self._playing_movies = list(movies_list)


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

    # Override auth dependency to bypass real token verification
    def override_get_current_user():
        return FakeUser(user_id=99)

    from app.db import get_db
    app.dependency_overrides[get_db] = override_get_db
    # IMPORTANT: Override the exact callable object referenced inside movies router
    app.dependency_overrides[movies.get_current_user] = override_get_current_user

    app.include_router(movies.router)

    with TestClient(app) as client:
        # attach fake_db for direct access in tests
        client.fake_db = fake_db  # type: ignore[attr-defined]
        yield client


def sample_movie_payload(**overrides):
    payload = {
        "title": "Inception",
        "description": "A mind-bending thriller",
        "duration_minutes": 148,
        "release_date": "2010-07-16",
        "language": "English",
        "genres": ["Sci-Fi", "Thriller"],
        "poster_url": "https://example.com/poster.jpg",
    }
    payload.update(overrides)
    return payload


def test_create_movie_success(test_app_client: TestClient):
    r = test_app_client.post("/movies", json=sample_movie_payload())
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["id"] == 1
    assert data["title"] == "Inception"
    assert data["language"] == "English"


def test_list_movies_after_creations(test_app_client: TestClient):
    test_app_client.post("/movies", json=sample_movie_payload(title="Movie A"))
    test_app_client.post("/movies", json=sample_movie_payload(title="Movie B"))

    r = test_app_client.get("/movies")
    assert r.status_code == 200
    movies_list = r.json()
    assert len(movies_list) == 2
    titles = {m["title"] for m in movies_list}
    assert {"Movie A", "Movie B"} <= titles


def test_get_movie_by_id_and_404(test_app_client: TestClient):
    test_app_client.post("/movies", json=sample_movie_payload(title="Only One"))

    r_ok = test_app_client.get("/movies/1")
    assert r_ok.status_code == 200
    assert r_ok.json()["title"] == "Only One"

    r_missing = test_app_client.get("/movies/999")
    assert r_missing.status_code == 404
    assert r_missing.json().get("detail") == "Movie not found"


def test_list_playing_movies_by_city(test_app_client: TestClient):
    # Create some movies to exist in storage
    test_app_client.post("/movies", json=sample_movie_payload(title="Playable 1"))
    test_app_client.post("/movies", json=sample_movie_payload(title="Playable 2"))
    test_app_client.post("/movies", json=sample_movie_payload(title="Non-Playable"))

    # Configure which ones are considered "playing" in our fake DB
    fake_db = test_app_client.fake_db  # type: ignore[attr-defined]
    # Choose first two movies as playing
    playing = [fake_db._movies[0], fake_db._movies[1]]

    # Monkeypatch FakeSession.query to return playing list when the join chain is used
    orig_query = fake_db.query

    def query_with_playing(model):
        q = orig_query(model)
        if model.__name__ == "Movie":
            # Wrap all() to return playing for the playing endpoint
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
                    # Return playing list regardless (sufficient for our tests)
                    return list(playing)
            return QueryWrapper(q)
        return q

    fake_db.query = query_with_playing  # type: ignore[assignment]

    r = test_app_client.get("/movies/playing", params={"city_id": 1})
    assert r.status_code == 200
    data = r.json()
    assert {m["title"] for m in data} == {"Playable 1", "Playable 2"}
