from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import OAuth2PasswordBearer
import logging
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.models import User
from useage.auth_service import (
    register_user,
    login_user,
    get_current_user_from_token,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidTokenError,
    UserNotFoundError,
)

# Define the router for authentication-related endpoints
router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# Define the OAuth2 scheme, expecting a Bearer token in the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")  # Expects Bearer <token> in Authorization header

# Register a new user
@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        # Attempt to register the user
        return register_user(user_in, db)
    except EmailAlreadyRegisteredError as e:
        # Map domain error to 400 Bad Request
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Generic 500 Internal Server Error fallback
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

# Login an existing user
@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    try:
        # Attempt to login the user
        return login_user(credentials, db)
    except InvalidCredentialsError as e:
        # Do not leak which field failed, return 401 Unauthorized
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        # Generic 500 Internal Server Error fallback
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

# Get the current authenticated user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        # Validate token signature/exp and load user
        return get_current_user_from_token(token, db)
    except (InvalidTokenError, UserNotFoundError) as e:
        # Unauthenticated, return 401 Unauthorized
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        # Generic 500 Internal Server Error fallback
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

# Return the authenticated user's profile
@router.get("/me", response_model=schemas.UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
