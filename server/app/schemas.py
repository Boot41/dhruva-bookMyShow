from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from datetime import date


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
