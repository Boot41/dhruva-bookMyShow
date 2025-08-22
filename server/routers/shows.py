from datetime import date as dt_date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app import schemas
from app.models import User
from .auth import get_current_user  # Auth dependency for protected endpoints
from useage.show_service import (
    get_movie_shows as get_movie_shows_svc,
    get_show as get_show_svc,
    create_show as create_show_svc,
    delete_show as delete_show_svc,
    ShowNotFoundError,
    ScreenNotFoundError,
    NotAuthorizedError,
    DuplicateShowError,
)

router = APIRouter(tags=["shows"])  # Show search and management endpoints

@router.get("/movies/{movie_id}/shows", response_model=list[schemas.ShowOut])
def get_movie_shows(
    movie_id: int,
    city_id: int = Query(..., description="City ID"),  # Required city filter
    date: Optional[dt_date] = Query(None, description="Show date (YYYY-MM-DD)"),  # Optional day filter
    theater_id: Optional[int] = Query(None, description="Filter by theater"),  # Optional theater filter
    db: Session = Depends(get_db),
):
    try:
        return get_movie_shows_svc(movie_id, city_id, date, theater_id, db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.get("/shows/{show_id}", response_model=schemas.ShowOut)
def get_show(show_id: int, db: Session = Depends(get_db)):
    try:
        return get_show_svc(show_id, db)
    except ShowNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))  # Resource not found
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.post("/shows", response_model=schemas.ShowOut, status_code=status.HTTP_201_CREATED)
def create_show(
    payload: schemas.ShowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Protected: requires authenticated user
):
    try:
        return create_show_svc(payload, current_user, db)
    except ScreenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))  # Target screen missing
    except NotAuthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))  # Lacks theater admin role
    except DuplicateShowError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))  # Violates unique slot constraint
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.delete("/shows/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_show(
    show_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Protected: requires authenticated user
):
    try:
        return delete_show_svc(show_id, current_user, db)
    except ShowNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))  # Target show not found
    except ScreenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))  # Related screen missing
    except NotAuthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))  # Not a theater admin
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")
