from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app import schemas
from pydantic import BaseModel
from useage.search_service import unified_search as unified_search_svc

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
    try:
        return unified_search_svc(q, city_id, limit_movies, limit_theaters, db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")
