from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import random
import string

from app.db import get_db
from app import schemas
from app.models import Show, Booking, BookingSeat

router = APIRouter(tags=["bookings"])


@router.post("/bookings", response_model=schemas.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: schemas.BookingCreate, db: Session = Depends(get_db)):
    # Basic validations
    show = db.get(Show, payload.show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    if not payload.seat_numbers or any(n <= 0 for n in payload.seat_numbers):
        raise HTTPException(status_code=400, detail="Invalid seat numbers")

    # MVP: No seat conflict checks yet. Compute amount = base_price * seat_count
    seat_count = len(set(payload.seat_numbers))
    final_amount = float(show.base_price) * seat_count

    # Generate a simple unique-ish booking reference
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    booking_ref = f"BMS-{rand}"

    booking = Booking(
        user_id=payload.user_id,  # optional user association
        booking_type="movie",
        show_id=show.id,
        event_id=None,
        booking_reference=booking_ref,
        final_amount=final_amount,
        booking_status="pending_payment",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return booking


@router.get(
    "/bookings",
    response_model=list[schemas.BookingOut],
)
def list_bookings(user_id: int | None = None, db: Session = Depends(get_db)):
    """List bookings, optionally filtered by user_id via query param.

    Examples:
    - GET /bookings -> all bookings
    - GET /bookings?user_id=123 -> bookings for user 123
    """
    query = db.query(Booking)
    if user_id is not None:
        query = query.filter(Booking.user_id == user_id)
    return query.all()


@router.post(
    "/booking-seats",
    response_model=schemas.BookingSeatOut,
    status_code=status.HTTP_201_CREATED,
)
def create_booking_seats(payload: schemas.BookingSeatCreate, db: Session = Depends(get_db)):
    # Validate booking
    booking = db.get(Booking, payload.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Validate show
    show = db.get(Show, payload.show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Basic validation for seats
    if not payload.seat_id or any((not isinstance(x, int)) or x <= 0 for x in payload.seat_id):
        raise HTTPException(status_code=400, detail="Invalid seat_id list")

    booking_seats = BookingSeat(
        booking_id=payload.booking_id,
        show_id=payload.show_id,
        seat_id=list(dict.fromkeys(payload.seat_id)),  # de-dup while preserving order
    )
    db.add(booking_seats)
    db.commit()
    db.refresh(booking_seats)

    return booking_seats


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
    # Validate show exists
    show = db.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Collect all seat ids stored against this show
    rows = db.query(BookingSeat).filter(BookingSeat.show_id == show_id).all()
    unavailable: list[int] = []
    for r in rows:
        # r.seat_id is a list[int]
        if isinstance(r.seat_id, list):
            unavailable.extend([n for n in r.seat_id if isinstance(n, int)])

    # de-dup and sort for UX
    dedup_sorted = sorted(set(unavailable))
    return schemas.BookingSeatsStatusResponse(
        show_id=show_id,
        unavailable_seat_numbers=dedup_sorted,
    )

