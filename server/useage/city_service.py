from sqlalchemy.orm import Session
from typing import List

from app.models import City


def list_cities(db: Session) -> List[City]:
    """Return all cities."""
    return db.query(City).all()
