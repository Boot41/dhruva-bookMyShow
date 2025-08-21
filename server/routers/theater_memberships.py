from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional

from app.db import get_db
from app import schemas
from app.models import TheaterUserMembership

router = APIRouter(tags=["theater_admins"])


@router.post(
    "/theater-memberships",
    response_model=schemas.TheaterUserMembershipOut,
    status_code=status.HTTP_201_CREATED,
)
def create_membership(
    payload: schemas.TheaterUserMembershipCreate,
    db: Session = Depends(get_db),
):
    membership = TheaterUserMembership(
        user_id=payload.user_id,
        theater_id=payload.theater_id,
        role=payload.role,
        permissions=payload.permissions,
        is_active=payload.is_active,
    )
    db.add(membership)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Membership already exists for this user and theater or invalid references")
    db.refresh(membership)
    return membership


@router.get(
    "/theater-memberships",
    response_model=list[schemas.TheaterUserMembershipOut],
)
def list_memberships(
    user_id: Optional[int] = Query(None, description="Filter by user_id"),
    theater_id: Optional[int] = Query(None, description="Filter by theater_id"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    q = db.query(TheaterUserMembership)
    if user_id is not None:
        q = q.filter(TheaterUserMembership.user_id == user_id)
    if theater_id is not None:
        q = q.filter(TheaterUserMembership.theater_id == theater_id)
    if is_active is not None:
        q = q.filter(TheaterUserMembership.is_active == is_active)
    return q.all()


@router.get(
    "/theater-memberships/{membership_id}",
    response_model=schemas.TheaterUserMembershipOut,
)
def get_membership(membership_id: int, db: Session = Depends(get_db)):
    membership = db.get(TheaterUserMembership, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    return membership


@router.patch(
    "/theater-memberships/{membership_id}",
    response_model=schemas.TheaterUserMembershipOut,
)
def update_membership(
    membership_id: int,
    payload: schemas.TheaterUserMembershipUpdate,
    db: Session = Depends(get_db),
):
    membership = db.get(TheaterUserMembership, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    if payload.role is not None:
        membership.role = payload.role
    if payload.permissions is not None:
        membership.permissions = payload.permissions
    if payload.is_active is not None:
        membership.is_active = payload.is_active

    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.delete(
    "/theater-memberships/{membership_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_membership(membership_id: int, db: Session = Depends(get_db)):
    membership = db.get(TheaterUserMembership, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    db.delete(membership)
    db.commit()
    return None
