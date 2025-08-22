from sqlalchemy.orm import Session
from typing import List

from app.models import Screen


class ScreenNotFoundError(Exception):
    pass


def list_screens_for_theater(theater_id: int, db: Session) -> List[Screen]:
    return db.query(Screen).filter(Screen.theater_id == theater_id).all()


def get_screen(screen_id: int, db: Session) -> Screen:
    screen = db.get(Screen, screen_id)
    if not screen:
        raise ScreenNotFoundError("Screen not found")
    return screen
