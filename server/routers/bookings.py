from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app import schemas
from useage.booking_service import (
    create_booking as create_booking_svc,
    list_bookings as list_bookings_svc,
    create_booking_seats as create_booking_seats_svc,
    get_booking_seats_status as get_booking_seats_status_svc,
    ShowNotFoundError,
    BookingNotFoundError,
    InvalidSeatNumbersError,
    InvalidSeatIdListError,
)

router = APIRouter(tags=["bookings"])


@router.post("/bookings", response_model=schemas.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: schemas.BookingCreate, db: Session = Depends(get_db)):
    try:
        return create_booking_svc(payload, db)
    except ShowNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidSeatNumbersError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get(
    "/bookings",
    response_model=list[schemas.BookingOut],
)
def list_bookings(user_id: int | None = None, db: Session = Depends(get_db)):
    """List bookings, optionally filtered by user_id via query param."""
    return list_bookings_svc(user_id, db)


@router.post(
    "/booking-seats",
    response_model=schemas.BookingSeatOut,
    status_code=status.HTTP_201_CREATED,
)
def create_booking_seats(payload: schemas.BookingSeatCreate, db: Session = Depends(get_db)):
    try:
        return create_booking_seats_svc(payload, db)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ShowNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidSeatIdListError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Alias with underscore for frontend compatibility
@router.post(
    "/booking_seats",
    response_model=schemas.BookingSeatOut,
    status_code=status.HTTP_201_CREATED,
)
def create_booking_seats_alias(payload: schemas.BookingSeatCreate, db: Session = Depends(get_db)):
    return create_booking_seats(payload, db)


@router.get(
    "/shows/{show_id}/booking_seats",
    response_model=schemas.BookingSeatsStatusResponse,
)
def get_booking_seats_status(show_id: int, db: Session = Depends(get_db)):
    try:
        return get_booking_seats_status_svc(show_id, db)
    except ShowNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

