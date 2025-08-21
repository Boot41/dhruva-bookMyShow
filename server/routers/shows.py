from datetime import date as dt_date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import get_db
from app import schemas
from app.models import Show, Screen, Theater, TheaterUserMembership, User
from .auth import get_current_user

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


@router.post("/shows", response_model=schemas.ShowOut, status_code=status.HTTP_201_CREATED)
def create_show(
    payload: schemas.ShowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure user has active membership in the theater that owns the screen
    screen = db.get(Screen, payload.screen_id)
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")

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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to manage shows for this theater")

    # Base validation: ensure movie exists implicitly via FK; initialize available seats from screen
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
        # Likely unique constraint on (screen_id, show_date, show_time)
        raise HTTPException(status_code=400, detail="A show already exists for this screen at the given date and time")
    db.refresh(show)
    return show


@router.delete("/shows/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_show(
    show_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    show = db.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    screen = db.get(Screen, show.screen_id)
    if not screen:
        # dangling show; treat as not found
        raise HTTPException(status_code=404, detail="Screen not found for show")

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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to manage shows for this theater")

    db.delete(show)
    db.commit()
    return None
