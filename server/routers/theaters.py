from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db import get_db
from app import schemas
from app.models import City, Theater, Show, Screen

router = APIRouter(tags=["theaters"])


@router.get("/cities", response_model=list[schemas.CityOut])
def list_cities(db: Session = Depends(get_db)):
    return db.query(City).all()


@router.get("/theaters", response_model=list[schemas.TheaterOut])
def list_theaters(
    city_id: int = Query(..., description="City ID"),
    movie_id: Optional[int] = Query(None, description="Filter by movie id"),
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Theater).filter(Theater.city_id == city_id, Theater.is_active == True)

    if movie_id is not None:
        # Join shows via screens to filter theaters that have a show for the movie
        q = (
            q.join(Screen, Screen.theater_id == Theater.id)
             .join(Show, Show.screen_id == Screen.id)
             .filter(Show.movie_id == movie_id)
             .distinct()
        )

    # Note: latitude/longitude are accepted but distance sorting is not implemented yet
    return q.all()
