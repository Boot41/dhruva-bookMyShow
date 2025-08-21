from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from datetime import date, time


class UserBase(BaseModel):
    email: EmailStr
    phone: str | None = None
    first_name: str
    last_name: str


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True

class MovieBase(BaseModel):
    title: str
    description: str | None = None
    duration_minutes: int
    release_date: date | None = None
    language: str
    genres: list[str] | None = None
    poster_url: str | None = None


class MovieCreate(MovieBase):
    pass


class MovieOut(MovieBase):
    id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Theater & Showtime Schemas
class CityOut(BaseModel):
    id: int
    name: str
    state: str | None = None
    country: str

    class Config:
        from_attributes = True


class TheaterOut(BaseModel):
    id: int
    name: str
    address: str
    city_id: int
    amenities: list[str] | None = None
    is_active: bool

    class Config:
        from_attributes = True


class ScreenOut(BaseModel):
    id: int
    theater_id: int
    name: str
    screen_type: str | None = None
    total_seats: int
    layout_config: dict

    class Config:
        from_attributes = True


class ShowOut(BaseModel):
    id: int
    movie_id: int
    screen_id: int
    show_date: date
    show_time: time
    base_price: float
    available_seats: int

    class Config:
        from_attributes = True


# Bookings
class BookingCreate(BaseModel):
    show_id: int
    seat_numbers: list[int]


class BookingOut(BaseModel):
    id: int
    user_id: int | None = None
    booking_type: str
    show_id: int | None = None
    event_id: int | None = None
    booking_reference: str
    final_amount: float
    booking_status: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


# Booking Seats (per-seat reservations)
class BookingSeatsHoldRequest(BaseModel):
    show_id: int
    seat_numbers: list[int]


class BookingSeatsHoldResponse(BaseModel):
    show_id: int
    held_seat_numbers: list[int]
    unavailable_seat_numbers: list[int]


class BookingSeatsStatusResponse(BaseModel):
    show_id: int
    # Seats that are currently not available for selection (held or booked)
    unavailable_seat_numbers: list[int]


# Booking Seats persistence
class BookingSeatCreate(BaseModel):
    show_id: int
    booking_id: int
    seat_id: list[int]


class BookingSeatOut(BaseModel):
    id: int
    show_id: int
    booking_id: int
    seat_id: list[int]

    class Config:
        from_attributes = True
