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
