import os
import sys
from pathlib import Path
from datetime import date as dt_date, time as dt_time, timedelta
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Ensure the app uses SQLite for import-time engine creation (not used here)
os.environ.setdefault("BMS_DATABASE_URL", "sqlite+pysqlite:///:memory:")

# Make `server/app` resolvable as top-level `app` when importing routers
SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from server.routers import shows
from app.db import get_db
from app.models import User, City, Theater, Screen, Movie, Show, TheaterUserMembership


class FakeQuery:
    def __init__(self, model, db):
        self.model = model
        self.db = db
        self._joined = []
        self._ordered_by_time = False

    # Router chains join() and filter(); we ignore expressions and compute in all()
    def join(self, *args, **kwargs):
        self._joined.append(args)
        return self

    def filter(self, *args, **kwargs):
        # Ignore SQLAlchemy expressions; filtering is applied in all()
        return self

    def order_by(self, *args, **kwargs):
        # Detect Show.show_time.asc() request by flagging ordering
        self._ordered_by_time = True
        return self

    def first(self):
        data = self.all()
        return data[0] if data else None

    def all(self):
        if self.model.__name__ == "Show":
            # Compute filtering used by get_movie_shows
            target_date = self.db._forced_date or dt_date.today()
            city_id = self.db._forced_city_id
            theater_filter = self.db._forced_theater_id
            movie_id = self.db._forced_movie_id

            def matches(show: Show):
                # screen and theater lookups
                screen = self.db.get(Screen, show.screen_id)
                theater = self.db.get(Theater, screen.theater_id) if screen else None
                return (
                    (movie_id is None or show.movie_id == movie_id)
                    and show.show_date == target_date
                    and theater is not None
                    and (city_id is None or theater.city_id == city_id)
                    and theater.is_active is True
                    and (theater_filter is None or theater.id == theater_filter)
                )

            items = [s for s in self.db._shows if matches(s)]
            if self._ordered_by_time:
                items.sort(key=lambda s: s.show_time)
            return items

        if self.model.__name__ == "TheaterUserMembership":
            # Used to validate membership in create/delete
            uid = self.db._current_user_id
            tid = self.db._current_theater_id
            for m in self.db._memberships:
                if m.user_id == uid and m.theater_id == tid and getattr(m, "is_active", True):
                    return [m]
            return []

        # Default empty
        return []


class FakeSession:
    def __init__(self):
        self._users: list[User] = []
        self._cities: list[City] = []
        self._theaters: list[Theater] = []
        self._screens: list[Screen] = []
        self._movies: list[Movie] = []
        self._shows: list[Show] = []
        self._memberships: list[TheaterUserMembership] = []

        self._id_seq = {"user": 1, "show": 1}

        # Context flags used by Query calculations
        self._forced_date: dt_date | None = None
        self._forced_city_id: int | None = None
        self._forced_theater_id: int | None = None
        self._forced_movie_id: int | None = None
        self._current_user_id: int | None = None
        self._current_theater_id: int | None = None

    # Dependency API used by router
    def add(self, obj):
        if isinstance(obj, Show):
            if getattr(obj, "id", None) is None:
                obj.id = self._id_seq["show"]
                self._id_seq["show"] += 1
            # simulate unique constraint on (screen_id, show_date, show_time)
            for s in self._shows:
                if (
                    s.screen_id == obj.screen_id
                    and s.show_date == obj.show_date
                    and s.show_time == obj.show_time
                ):
                    # raise IntegrityError-like by using an Exception caught in router
                    # We can't import IntegrityError here; router catches it broadly as IntegrityError
                    # so we delay actual raising to commit()
                    self._pending_error = True
                    break
            self._shows.append(obj)
            return
        if isinstance(obj, User):
            if getattr(obj, "id", None) is None:
                obj.id = self._id_seq["user"]
                self._id_seq["user"] += 1
            self._users.append(obj)
            return
        if isinstance(obj, City):
            self._cities.append(obj)
            return
        if isinstance(obj, Theater):
            self._theaters.append(obj)
            return
        if isinstance(obj, Screen):
            self._screens.append(obj)
            return
        if isinstance(obj, Movie):
            self._movies.append(obj)
            return
        if isinstance(obj, TheaterUserMembership):
            self._memberships.append(obj)
            return

    def commit(self):
        # Raise integrity error if flagged
        if getattr(self, "_pending_error", False):
            self._pending_error = False
            from sqlalchemy.exc import IntegrityError

            raise IntegrityError("dupe", params=None, orig=None)

    def refresh(self, obj):
        # No-op for fakes
        pass

    def rollback(self):
        # No-op rollback for compatibility
        self._pending_error = False

    def get(self, model, pk: int):
        if model.__name__ == "Show":
            for s in self._shows:
                if getattr(s, "id", None) == pk:
                    # set theater context for delete flow
                    sc = self.get(Screen, s.screen_id)
                    if sc is not None:
                        self._current_theater_id = sc.theater_id
                    return s
            return None
        if model.__name__ == "Screen":
            for sc in self._screens:
                if sc.id == pk:
                    # update theater context for membership checks
                    self._current_theater_id = sc.theater_id
                    return sc
            return None
        if model.__name__ == "Theater":
            for t in self._theaters:
                if t.id == pk:
                    return t
            return None
        if model.__name__ == "Movie":
            for m in self._movies:
                if m.id == pk:
                    return m
            return None
        if model.__name__ == "User":
            for u in self._users:
                if u.id == pk:
                    return u
            return None
        return None

    def query(self, model):
        return FakeQuery(model, self)

    def delete(self, obj):
        if isinstance(obj, Show):
            self._shows = [s for s in self._shows if s is not obj]


@pytest.fixture()
def test_app_client():
    app = FastAPI()
    fake_db = FakeSession()

    # Seed baseline data into fake DB
    u1 = User(email="manager@example.com", phone=None, password_hash="x", first_name="Mgr", last_name="One")
    u2 = User(email="user@example.com", phone=None, password_hash="x", first_name="Usr", last_name="Two")
    fake_db.add(u1)
    fake_db.add(u2)
    fake_db._current_user_id = u1.id

    city = City(name="Metropolis", state="ST", country="CT")
    fake_db.add(city)

    theater = Theater(id=1, name="Prime Theater", address="Addr", city_id=1, amenities=None, is_active=True)
    fake_db.add(theater)

    screen = Screen(id=10, theater_id=1, name="Screen A", screen_type=None, total_seats=120, layout_config={"rows": 12, "cols": 10})
    fake_db.add(screen)

    movie = Movie(id=100, title="Test Movie", description=None, duration_minutes=120, release_date=dt_date(2020,1,1), language="EN", genres=["Action"], poster_url=None)
    fake_db.add(movie)

    membership = TheaterUserMembership(id=1, user_id=u1.id, theater_id=1, role="manager", permissions=None, is_active=True)
    fake_db.add(membership)

    def override_get_db():
        try:
            yield fake_db
        finally:
            pass

    # Auth override helpers
    class CurrentUser:
        def __init__(self, user_id: int):
            self.id = user_id

    # Default current user is manager (authorized)
    def override_get_current_user_manager():
        return CurrentUser(user_id=1)

    # Alternate: a non-member user
    def override_get_current_user_nonmember():
        return CurrentUser(user_id=2)

    # Register dependency overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[shows.get_current_user] = override_get_current_user_manager

    app.include_router(shows.router)

    with TestClient(app) as client:
        # Expose helpers to switch auth in tests
        client.set_auth_manager = lambda: (
            app.dependency_overrides.__setitem__(shows.get_current_user, override_get_current_user_manager),
            setattr(fake_db, "_current_user_id", u1.id),
        )  # type: ignore[attr-defined]
        client.set_auth_nonmember = lambda: (
            app.dependency_overrides.__setitem__(shows.get_current_user, override_get_current_user_nonmember),
            setattr(fake_db, "_current_user_id", u2.id),
        )  # type: ignore[attr-defined]
        # Helper to control query context for list endpoint
        client.set_show_query_context = lambda *, date=None, city_id=None, theater_id=None, movie_id=None: (
            setattr(fake_db, "_forced_date", date),
            setattr(fake_db, "_forced_city_id", city_id),
            setattr(fake_db, "_forced_theater_id", theater_id),
            setattr(fake_db, "_forced_movie_id", movie_id),
        )  # type: ignore[attr-defined]
        yield client


def create_show_payload(movie_id=100, screen_id=10, show_date=None, show_time=None, base_price=250.0):
    if show_date is None:
        show_date = dt_date.today()
    if show_time is None:
        show_time = dt_time(18, 0, 0)
    return {
        "movie_id": movie_id,
        "screen_id": screen_id,
        "show_date": show_date.isoformat(),
        "show_time": show_time.isoformat(),
        "base_price": base_price,
    }


def test_create_show_success_sets_available_seats_and_returns_201(test_app_client: TestClient):
    r = test_app_client.post("/shows", json=create_show_payload())
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["screen_id"] == 10
    assert data["movie_id"] == 100
    # available_seats should be initialized from screen.total_seats (120)
    assert data["available_seats"] == 120


def test_create_show_forbidden_without_membership(test_app_client: TestClient):
    # Switch auth to non-member user
    test_app_client.set_auth_nonmember()
    r = test_app_client.post("/shows", json=create_show_payload(show_time=dt_time(20, 0, 0)))
    assert r.status_code == 403
    assert r.json().get("detail") == "Not authorized to manage shows for this theater"


def test_create_show_duplicate_same_screen_date_time_returns_400(test_app_client: TestClient):
    # First creation OK
    r1 = test_app_client.post("/shows", json=create_show_payload(show_time=dt_time(10, 0, 0)))
    assert r1.status_code == 201
    # Duplicate at same screen/date/time
    r2 = test_app_client.post("/shows", json=create_show_payload(show_time=dt_time(10, 0, 0)))
    assert r2.status_code == 400
    assert r2.json().get("detail") == "A show already exists for this screen at the given date and time"


def test_get_show_by_id_and_404(test_app_client: TestClient):
    # Create one
    r_create = test_app_client.post("/shows", json=create_show_payload(show_time=dt_time(11, 30, 0)))
    assert r_create.status_code == 201
    show_id = r_create.json()["id"]

    r_ok = test_app_client.get(f"/shows/{show_id}")
    assert r_ok.status_code == 200
    assert r_ok.json()["id"] == show_id

    r_missing = test_app_client.get("/shows/999999")
    assert r_missing.status_code == 404
    assert r_missing.json().get("detail") == "Show not found"


def test_delete_show_requires_membership_and_deletes(test_app_client: TestClient):
    # Create as manager
    r_create = test_app_client.post("/shows", json=create_show_payload(show_time=dt_time(13, 0, 0)))
    assert r_create.status_code == 201
    show_id = r_create.json()["id"]

    # Delete succeeds
    r_del = test_app_client.delete(f"/shows/{show_id}")
    assert r_del.status_code == 204

    # Verify gone
    r_get = test_app_client.get(f"/shows/{show_id}")
    assert r_get.status_code == 404


def test_delete_show_forbidden_for_non_member(test_app_client: TestClient):
    # Create with manager
    r_create = test_app_client.post("/shows", json=create_show_payload(show_time=dt_time(15, 0, 0)))
    assert r_create.status_code == 201
    show_id = r_create.json()["id"]

    # Switch to non-member and attempt delete
    test_app_client.set_auth_nonmember()
    r_forbid = test_app_client.delete(f"/shows/{show_id}")
    assert r_forbid.status_code == 403
    assert r_forbid.json().get("detail") == "Not authorized to manage shows for this theater"


def test_list_movie_shows_filters_by_city_date_and_theater_and_orders_by_time(test_app_client: TestClient):
    today = dt_date.today()
    tomorrow = today + timedelta(days=1)

    # Ensure manager auth
    test_app_client.set_auth_manager()

    # Create shows for different times/dates
    r1 = test_app_client.post("/shows", json=create_show_payload(show_date=today, show_time=dt_time(9, 0, 0)))
    r2 = test_app_client.post("/shows", json=create_show_payload(show_date=today, show_time=dt_time(14, 0, 0)))
    r3 = test_app_client.post("/shows", json=create_show_payload(show_date=tomorrow, show_time=dt_time(18, 0, 0)))
    assert r1.status_code == r2.status_code == r3.status_code == 201

    # Default date= today
    test_app_client.set_show_query_context(date=None, city_id=1, theater_id=None, movie_id=100)
    r_today = test_app_client.get(f"/movies/100/shows", params={"city_id": 1})
    assert r_today.status_code == 200
    data_today = r_today.json()
    # Should return the two shows for today in time order
    assert [s["show_time"] for s in data_today] == ["09:00:00", "14:00:00"]

    # Filter by theater_id (same theater id=1)
    test_app_client.set_show_query_context(date=today, city_id=1, theater_id=1, movie_id=100)
    r_th = test_app_client.get(f"/movies/100/shows", params={"city_id": 1, "theater_id": 1, "date": today.isoformat()})
    assert r_th.status_code == 200
    data_th = r_th.json()
    assert len(data_th) == 2

    # Date filter = tomorrow only 1
    test_app_client.set_show_query_context(date=tomorrow, city_id=1, theater_id=None, movie_id=100)
    r_tom = test_app_client.get(f"/movies/100/shows", params={"city_id": 1, "date": tomorrow.isoformat()})
    assert r_tom.status_code == 200
    data_tom = r_tom.json()
    assert len(data_tom) == 1
