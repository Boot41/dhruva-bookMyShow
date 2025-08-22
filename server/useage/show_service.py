from datetime import date as dt_date
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import schemas
from app.models import Show, Screen, Theater, TheaterUserMembership, User


class ShowNotFoundError(Exception):
    pass


class ScreenNotFoundError(Exception):
    pass


class NotAuthorizedError(Exception):
    pass


class DuplicateShowError(Exception):
    pass


def get_movie_shows(movie_id: int, city_id: int, date: Optional[dt_date], theater_id: Optional[int], db: Session):
    target_date = date or dt_date.today()

    q = (
        db.query(Show)
        .join(Screen, Screen.id == Show.screen_id)
        .join(Theater, Theater.id == Screen.theater_id)
        .filter(
            Show.movie_id == movie_id,
            Show.show_date == target_date,
            Theater.city_id == city_id,
            Theater.is_active == True,
        )
    )
    if theater_id is not None:
        q = q.filter(Theater.id == theater_id)

    q = q.order_by(Show.show_time.asc())
    return q.all()


def get_show(show_id: int, db: Session) -> Show:
    show = db.get(Show, show_id)
    if not show:
        raise ShowNotFoundError("Show not found")
    return show


def _ensure_membership_for_screen(screen: Screen, current_user: User, db: Session):
    membership = (
        db.query(TheaterUserMembership)
        .filter(
            TheaterUserMembership.user_id == current_user.id,
            TheaterUserMembership.theater_id == screen.theater_id,
            TheaterUserMembership.is_active == True,
        )
        .first()
    )
    if not membership:
        raise NotAuthorizedError("Not authorized to manage shows for this theater")


def create_show(payload: schemas.ShowCreate, current_user: User, db: Session) -> Show:
    screen = db.get(Screen, payload.screen_id)
    if not screen:
        raise ScreenNotFoundError("Screen not found")

    _ensure_membership_for_screen(screen, current_user, db)

    available_seats = screen.total_seats
    show = Show(
        movie_id=payload.movie_id,
        screen_id=payload.screen_id,
        show_date=payload.show_date,
        show_time=payload.show_time,
        base_price=payload.base_price,
        available_seats=available_seats,
    )
    db.add(show)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateShowError("A show already exists for this screen at the given date and time")
    db.refresh(show)
    return show


def delete_show(show_id: int, current_user: User, db: Session) -> None:
    show = db.get(Show, show_id)
    if not show:
        raise ShowNotFoundError("Show not found")

    screen = db.get(Screen, show.screen_id)
    if not screen:
        raise ScreenNotFoundError("Screen not found for show")

    _ensure_membership_for_screen(screen, current_user, db)

    db.delete(show)
    db.commit()
    return None
