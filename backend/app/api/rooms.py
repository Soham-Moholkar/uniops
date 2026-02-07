"""Room listing routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from app.db.relational import get_db
from app.auth.auth import get_current_user
from app.models.schemas import RoomOut

router = APIRouter()


@router.get("", response_model=List[RoomOut])
def list_rooms(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    rows = db.execute(
        text("SELECT room_id, name, building, capacity FROM room ORDER BY building, name")
    ).fetchall()
    return [RoomOut(room_id=r[0], name=r[1], building=r[2], capacity=r[3]) for r in rows]
