from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app import schemas
from routers.auth import get_current_user  # protect write ops
from useage.movie_service import (
    create_movie as create_movie_svc,
    list_movies as list_movies_svc,
    list_playing_movies as list_playing_movies_svc,
    get_movie as get_movie_svc,
    MovieNotFoundError,
)

router = APIRouter(prefix="/movies", tags=["movies"])

@router.post("", response_model=schemas.MovieOut, status_code=status.HTTP_201_CREATED)
def create_movie(movie_in: schemas.MovieCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return create_movie_svc(movie_in, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("", response_model=list[schemas.MovieOut])
def list_movies(db: Session = Depends(get_db)):
    return list_movies_svc(db)

@router.get("/playing", response_model=list[schemas.MovieOut])
def list_playing_movies(
    city_id: int = Query(..., description="City ID"),
    db: Session = Depends(get_db),
):
    """Return distinct movies that have at least one show in the specified city.

    - Filters theaters by city and active status only.
    - No date, language, or genre filters applied.
    """
    try:
        return list_playing_movies_svc(city_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{movie_id}", response_model=schemas.MovieOut)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    try:
        return get_movie_svc(movie_id, db)
    except MovieNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")