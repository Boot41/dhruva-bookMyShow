from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app import schemas
from app.models import Screen

router = APIRouter(tags=["screens"])


@router.get("/theaters/{theater_id}/screens", response_model=list[schemas.ScreenOut])
def list_screens_for_theater(theater_id: int, db: Session = Depends(get_db)):
    """List all screens for a given theater."""
    return db.query(Screen).filter(Screen.theater_id == theater_id).all()


@router.get("/screens/{screen_id}", response_model=schemas.ScreenOut)
def get_screen(screen_id: int, db: Session = Depends(get_db)):
    """Get a single screen by ID."""
    screen = db.get(Screen, screen_id)
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    return screen
