from datetime import date as dt_date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app import schemas
from app.models import Show, Screen, Theater

router = APIRouter(tags=["shows"])


@router.get("/movies/{movie_id}/shows", response_model=list[schemas.ShowOut])
def get_movie_shows(
    movie_id: int,
    city_id: int = Query(..., description="City ID"),
    date: Optional[dt_date] = Query(None, description="Show date (YYYY-MM-DD)"),
    theater_id: Optional[int] = Query(None, description="Filter by theater"),
    db: Session = Depends(get_db),
):
    # default to today if date not provided
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

    # Could order by time
    q = q.order_by(Show.show_time.asc())

    return q.all()


@router.get("/shows/{show_id}", response_model=schemas.ShowOut)
def get_show(show_id: int, db: Session = Depends(get_db)):
    show = db.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    return show
