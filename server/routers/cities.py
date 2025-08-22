from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session


from app.db import get_db
from app import schemas
from app.models import City
from useage.city_service import list_cities as list_cities_svc

router = APIRouter(tags=["cities"])


@router.get("/cities", response_model=list[schemas.CityOut])
def list_cities(db: Session = Depends(get_db)):
    try:
        return list_cities_svc(db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")