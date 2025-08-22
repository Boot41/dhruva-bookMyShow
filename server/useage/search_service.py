from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict

from app.models import Movie, Theater


def unified_search(q: str, city_id: int | None, limit_movies: int, limit_theaters: int, db: Session) -> Dict[str, list]:
    q_norm = q.strip().lower()

    m_query = (
        db.query(Movie)
        .filter(func.lower(Movie.title).like(f"%{q_norm}%"))
        .order_by(func.length(Movie.title))
        .limit(limit_movies)
    )
    movies = m_query.all()

    theaters: List[Theater] = []
    if city_id is not None:
        t_query = (
            db.query(Theater)
            .filter(
                Theater.city_id == city_id,
                Theater.is_active == True,  # noqa: E712
                (
                    func.lower(Theater.name).like(f"%{q_norm}%")
                    | func.lower(Theater.address).like(f"%{q_norm}%")
                ),
            )
            .order_by(func.length(Theater.name))
            .limit(limit_theaters)
        )
        theaters = t_query.all()

    return {"movies": movies, "theaters": theaters}
