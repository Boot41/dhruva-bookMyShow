from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import random
import string

from app.db import get_db
from app import schemas
from app.models import Show, Booking

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
        user_id=None,  # plug auth later
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

