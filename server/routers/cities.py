from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session


from app.db import get_db
from app import schemas
from app.models import City

router = APIRouter(tags=["cities"])


@router.get("/cities", response_model=list[schemas.CityOut])
def list_cities(db: Session = Depends(get_db)):
    return db.query(City).all()