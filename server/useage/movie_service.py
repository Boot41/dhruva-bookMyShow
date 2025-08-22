from sqlalchemy.orm import Session
from sqlalchemy import func

from app import schemas
from app.models import Movie, Theater, Screen, Show


class MovieNotFoundError(Exception):
    pass


def create_movie(movie_in: schemas.MovieCreate, db: Session) -> Movie:
    movie = Movie(**movie_in.model_dump())
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie


def list_movies(db: Session) -> list[Movie]:
    return db.query(Movie).all()


def list_playing_movies(city_id: int, db: Session) -> list[Movie]:
    q = (
        db.query(Movie)
        .join(Show, Show.movie_id == Movie.id)
        .join(Screen, Screen.id == Show.screen_id)
        .join(Theater, Theater.id == Screen.theater_id)
        .filter(Theater.city_id == city_id, Theater.is_active == True)
    )
    return q.distinct(Movie.id).all()


def get_movie(movie_id: int, db: Session) -> Movie:
    movie = db.get(Movie, movie_id)
    if not movie:
        raise MovieNotFoundError("Movie not found")
    return movie
