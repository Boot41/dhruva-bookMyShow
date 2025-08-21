from pydantic import BaseModel, EmailStr, Field, ConfigDict
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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_theater_admin: bool = False


# Theater & Showtime Schemas
class CityOut(BaseModel):
    id: int
    name: str
    state: str | None = None
    country: str
    model_config = ConfigDict(from_attributes=True)


class TheaterOut(BaseModel):
    id: int
    name: str
    address: str
    city_id: int
    amenities: list[str] | None = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class ScreenOut(BaseModel):
    id: int
    theater_id: int
    name: str
    screen_type: str | None = None
    total_seats: int
    layout_config: dict
    model_config = ConfigDict(from_attributes=True)


class ShowOut(BaseModel):
    id: int
    movie_id: int
    screen_id: int
    show_date: date
    show_time: time
    base_price: float
    available_seats: int
    model_config = ConfigDict(from_attributes=True)


class ShowCreate(BaseModel):
    movie_id: int
    screen_id: int
    show_date: date
    show_time: time
    base_price: float


# Bookings
class BookingCreate(BaseModel):
    show_id: int
    seat_numbers: list[int]
    user_id: int


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
    model_config = ConfigDict(from_attributes=True)


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
    model_config = ConfigDict(from_attributes=True)


# Theater User Memberships
class TheaterUserMembershipBase(BaseModel):
    user_id: int
    theater_id: int
    role: str
    permissions: dict | None = None
    is_active: bool = True


class TheaterUserMembershipCreate(TheaterUserMembershipBase):
    pass


class TheaterUserMembershipUpdate(BaseModel):
    role: str | None = None
    permissions: dict | None = None
    is_active: bool | None = None


class TheaterUserMembershipOut(TheaterUserMembershipBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
