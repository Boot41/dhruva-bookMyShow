from datetime import datetime, date, time

from sqlalchemy import String, Text, Date, BigInteger, Integer, ForeignKey, Time, Numeric, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy import DateTime, func

from .db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        UniqueConstraint("phone", name="uq_users_phone"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class Movie(Base):
    __tablename__ = "movies"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    release_date: Mapped[date] = mapped_column(Date, nullable=True)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    genres: Mapped[list[str]] = mapped_column(JSONB, nullable=True)
    poster_url: Mapped[str | None] = mapped_column(String(255), nullable=True)


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)


class Theater(Base):
    __tablename__ = "theaters"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city_id: Mapped[int] = mapped_column(Integer, ForeignKey("cities.id"), index=True)
    amenities: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Screen(Base):
    __tablename__ = "screens"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    theater_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("theaters.id"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    screen_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    total_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    layout_config: Mapped[dict] = mapped_column(JSONB, nullable=False)


class Show(Base):
    __tablename__ = "shows"
    __table_args__ = (
        UniqueConstraint("screen_id", "show_date", "show_time", name="uq_shows_screen_date_time"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    movie_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("movies.id"), index=True)
    screen_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("screens.id"), index=True)
    show_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    show_time: Mapped[time] = mapped_column(Time, nullable=False)
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    available_seats: Mapped[int] = mapped_column(Integer, nullable=False)


class Booking(Base):
    __tablename__ = "bookings"

    # Use Integer PK to ensure SQLite autoincrement works correctly
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    booking_type: Mapped[str] = mapped_column(String(20), nullable=False)
    show_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("shows.id"), nullable=True, index=True)
    event_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    booking_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    final_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    booking_status: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), nullable=True
    )


class BookingSeat(Base):
    __tablename__ = "booking_seats"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("bookings.id"), index=True)
    show_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("shows.id"), index=True)
    # Storing selected seat ids as an array in JSONB per table design
    seat_id: Mapped[list[int]] = mapped_column(JSONB, nullable=False)