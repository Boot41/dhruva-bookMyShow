from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url, pool_pre_ping=True)  # pre_ping avoids stale connections
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)  # explicit commit; control flush


def get_db():
    db = SessionLocal()  # New session per request
    try:
        yield db  # Dependency yields a session; FastAPI ensures finally runs
    finally:
        db.close()  # Always close to return connection to pool
