from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app import schemas
from pydantic import BaseModel
from useage.search_service import unified_search as unified_search_svc

router = APIRouter(prefix="/search", tags=["search"])  # Unified search across resources

class SearchResponse(BaseModel):
    movies: list[schemas.MovieOut]   # Subset of movie fields via schema
    theaters: list[schemas.TheaterOut]  # Subset of theater fields via schema

@router.get("", response_model=SearchResponse)
def unified_search(
    q: str = Query(..., min_length=1, description="Search query"),  # Required query string
    city_id: int | None = Query(None, description="City ID for theater filtering"),  # Optional theater filter
    limit_movies: int = Query(5, ge=1, le=50),  # Pagination control
    limit_theaters: int = Query(5, ge=1, le=50),  # Pagination control
    db: Session = Depends(get_db),
):
    try:
        return unified_search_svc(q, city_id, limit_movies, limit_theaters, db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")
