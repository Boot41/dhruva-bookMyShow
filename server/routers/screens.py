from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app import schemas
from useage.screen_service import (
    list_screens_for_theater as list_screens_for_theater_svc,
    get_screen as get_screen_svc,
    ScreenNotFoundError,
)

router = APIRouter(tags=["screens"])  # Screen read endpoints

@router.get("/theaters/{theater_id}/screens", response_model=list[schemas.ScreenOut])
def list_screens_for_theater(theater_id: int, db: Session = Depends(get_db)):
    """List all screens for a given theater."""
    return list_screens_for_theater_svc(theater_id, db)

@router.get("/screens/{screen_id}", response_model=schemas.ScreenOut)
def get_screen(screen_id: int, db: Session = Depends(get_db)):
    """Get a single screen by ID."""
    try:
        return get_screen_svc(screen_id, db)
    except ScreenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))  # Resource not found
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")
