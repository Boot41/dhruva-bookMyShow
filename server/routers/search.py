from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app import schemas
from app.models import Movie, Theater
from pydantic import BaseModel

router = APIRouter(prefix="/search", tags=["search"]) 


class SearchResponse(BaseModel):
    movies: list[schemas.MovieOut]
    theaters: list[schemas.TheaterOut]


@router.get("", response_model=SearchResponse)
def unified_search(
    q: str = Query(..., min_length=1, description="Search query"),
    city_id: int | None = Query(None, description="City ID for theater filtering"),
    limit_movies: int = Query(5, ge=1, le=50),
    limit_theaters: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    q_norm = q.strip().lower()

    # Movies: simple case-insensitive contains match on title
    m_query = (
        db.query(Movie)
        .filter(func.lower(Movie.title).like(f"%{q_norm}%"))
        .order_by(func.length(Movie.title))
        .limit(limit_movies)
    )
    movies = m_query.all()

    # Theaters: require city_id to keep search scoped; if not provided, return empty list
    theaters: list[Theater] = []
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
