import logging
import random
import string
from sqlalchemy.orm import Session

from app import schemas
from app.models import Show, Booking, BookingSeat

logger = logging.getLogger(__name__)


# Domain exceptions
class ShowNotFoundError(Exception):
    pass


class BookingNotFoundError(Exception):
    pass


class InvalidSeatNumbersError(Exception):
    pass


class InvalidSeatIdListError(Exception):
    pass


def create_booking(payload: schemas.BookingCreate, db: Session) -> Booking:
    """Create a booking for a show after minimal validations."""
    show = db.get(Show, payload.show_id)
    if not show:
        raise ShowNotFoundError("Show not found")

    if not payload.seat_numbers or any(n <= 0 for n in payload.seat_numbers):
        raise InvalidSeatNumbersError("Invalid seat numbers")

    seat_count = len(set(payload.seat_numbers))
    final_amount = float(show.base_price) * seat_count

    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    booking_ref = f"BMS-{rand}"

    booking = Booking(
        user_id=payload.user_id,
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


def list_bookings(user_id: int | None, db: Session) -> list[Booking]:
    query = db.query(Booking)
    if user_id is not None:
        query = query.filter(Booking.user_id == user_id)
    return query.all()


def create_booking_seats(payload: schemas.BookingSeatCreate, db: Session) -> BookingSeat:
    booking = db.get(Booking, payload.booking_id)
    if not booking:
        raise BookingNotFoundError("Booking not found")

    show = db.get(Show, payload.show_id)
    if not show:
        raise ShowNotFoundError("Show not found")

    if not payload.seat_id or any((not isinstance(x, int)) or x <= 0 for x in payload.seat_id):
        raise InvalidSeatIdListError("Invalid seat_id list")

    booking_seats = BookingSeat(
        booking_id=payload.booking_id,
        show_id=payload.show_id,
        seat_id=list(dict.fromkeys(payload.seat_id)),
    )
    db.add(booking_seats)
    db.commit()
    db.refresh(booking_seats)
    return booking_seats


def get_booking_seats_status(show_id: int, db: Session) -> schemas.BookingSeatsStatusResponse:
    show = db.get(Show, show_id)
    if not show:
        raise ShowNotFoundError("Show not found")

    rows = db.query(BookingSeat).filter(BookingSeat.show_id == show_id).all()
    unavailable: list[int] = []
    for r in rows:
        if isinstance(r.seat_id, list):
            unavailable.extend([n for n in r.seat_id if isinstance(n, int)])

    dedup_sorted = sorted(set(unavailable))
    return schemas.BookingSeatsStatusResponse(
        show_id=show_id,
        unavailable_seat_numbers=dedup_sorted,
    )
