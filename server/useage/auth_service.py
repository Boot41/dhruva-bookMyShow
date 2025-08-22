import logging
from sqlalchemy.orm import Session
from app import schemas

from app.models import TheaterUserMembership, User
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

logger = logging.getLogger(__name__)


# Domain-level exceptions (service layer should not depend on FastAPI)
class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidTokenError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


def is_user_theater_admin(user_id: int, db: Session) -> bool:
    """
    Returns True if the user has any active theater membership (any role), else False.
    """
    membership = (
        db.query(TheaterUserMembership)
        .filter(
            TheaterUserMembership.user_id == user_id,
            TheaterUserMembership.is_active == True,
        )
        .first()
    )
    return membership is not None


def register_user(user_in: schemas.UserCreate, db: Session) -> User:
    """Create and return a new user. Raises 400 if email already exists."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise EmailAlreadyRegisteredError("Email already registered")

    user = User(
        email=user_in.email,
        phone=user_in.phone,
        password_hash=hash_password(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(credentials: schemas.UserLogin, db: Session) -> schemas.Token:
    """Authenticate user and return Token with is_theater_admin flag. Raises 401 on failure."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        logger.info(f"Login failed: email not found: {credentials.email}")
        raise InvalidCredentialsError("Invalid credentials")

    if not verify_password(credentials.password, user.password_hash):
        logger.info(f"Login failed: password mismatch for user_id={user.id} email={user.email}")
        raise InvalidCredentialsError("Invalid credentials")

    token = create_access_token(subject=user.id)
    is_admin = is_user_theater_admin(user.id, db)
    return schemas.Token(access_token=token, is_theater_admin=is_admin)


def get_current_user_from_token(token: str, db: Session) -> User:
    """Decode token and return the corresponding user or raise 401."""
    data = decode_access_token(token)
    if not data or "sub" not in data:
        raise InvalidTokenError("Invalid token")
    user_id = int(data["sub"])
    user = db.get(User, user_id)
    if not user:
        raise UserNotFoundError("User not found")
    return user