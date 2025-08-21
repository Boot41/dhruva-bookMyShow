from app import schemas
from app.db import get_db
from sqlalchemy.orm import Session

from app.models import TheaterUserMembership


def is_user_theater_admin(user_id: int, db: Session) -> bool:
    """
    Returns True if the user has any active theater membership (any role), else False.
    """
    membership = (
        db.query(TheaterUserMembership)
        .filter(
            TheaterUserMembership.user_id == user_id,
            TheaterUserMembership.is_active == True,
        )
        .first()
    )
    return membership is not None