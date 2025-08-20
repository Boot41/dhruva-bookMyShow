from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app import schemas
from app.models import Movie, Theater, Screen, Show
from routers.auth import get_current_user  # protect write ops

router = APIRouter(prefix="/movies", tags=["movies"])

@router.post("", response_model=schemas.MovieOut, status_code=status.HTTP_201_CREATED)
def create_movie(movie_in: schemas.MovieCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    movie = Movie(**movie_in.model_dump())
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie

@router.get("", response_model=list[schemas.MovieOut])
def list_movies(db: Session = Depends(get_db)):
    return db.query(Movie).all()

@router.get("/playing", response_model=list[schemas.MovieOut])
def list_playing_movies(
    city_id: int = Query(..., description="City ID"),
    db: Session = Depends(get_db),
):
    """Return distinct movies that have at least one show in the specified city.

    - Filters theaters by city and active status only.
    - No date, language, or genre filters applied.
    """
    q = (
        db.query(Movie)
        .join(Show, Show.movie_id == Movie.id)
        .join(Screen, Screen.id == Show.screen_id)
        .join(Theater, Theater.id == Screen.theater_id)
        .filter(Theater.city_id == city_id, Theater.is_active == True)
    )

    return q.distinct(Movie.id).all()

@router.get("/{movie_id}", response_model=schemas.MovieOut)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie