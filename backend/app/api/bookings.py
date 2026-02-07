"""Event booking routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from app.db.relational import get_db
from app.auth.auth import get_current_user, require_role
from app.models.schemas import BookingCreate, BookingOut, BookingUpdate

router = APIRouter()


@router.get("", response_model=List[BookingOut])
def list_bookings(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    rows = db.execute(
        text("""
            SELECT eb.booking_id, eb.room_id, r.name, eb.organizer_student_id,
                   s.name, eb.start_time, eb.end_time, eb.purpose, eb.status, eb.created_at
            FROM event_booking eb
            JOIN room r ON eb.room_id = r.room_id
            JOIN student s ON eb.organizer_student_id = s.student_id
            ORDER BY eb.start_time DESC
        """)
    ).fetchall()
    return [
        BookingOut(
            booking_id=r[0], room_id=r[1], room_name=r[2],
            organizer_student_id=r[3], organizer_name=r[4],
            start_time=r[5], end_time=r[6], purpose=r[7],
            status=r[8], created_at=r[9],
        )
        for r in rows
    ]


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(body: BookingCreate, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    # Validate room
    room = db.execute(text("SELECT name FROM room WHERE room_id = :r"), {"r": body.room_id}).fetchone()
    if not room:
        raise HTTPException(404, "Room not found")

    # Validate student
    stu = db.execute(text("SELECT name FROM student WHERE student_id = :s"), {"s": body.organizer_student_id}).fetchone()
    if not stu:
        raise HTTPException(404, "Student not found")

    if body.end_time <= body.start_time:
        raise HTTPException(400, "End time must be after start time")

    try:
        result = db.execute(
            text("""
                INSERT INTO event_booking (room_id, organizer_student_id, start_time, end_time, purpose)
                VALUES (:r, :s, :st, :et, :p)
                RETURNING booking_id, created_at
            """),
            {"r": body.room_id, "s": body.organizer_student_id,
             "st": body.start_time, "et": body.end_time, "p": body.purpose},
        )
        db.commit()
        row = result.fetchone()
        return BookingOut(
            booking_id=row[0], room_id=body.room_id, room_name=room[0],
            organizer_student_id=body.organizer_student_id, organizer_name=stu[0],
            start_time=body.start_time, end_time=body.end_time,
            purpose=body.purpose, status="pending", created_at=row[1],
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(400, detail=str(e).split("\n")[0])


@router.patch("/{booking_id}", response_model=dict)
def update_booking_status(
    booking_id: int, body: BookingUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if body.status == "approved":
        try:
            db.execute(text("CALL approve_booking(:bid)"), {"bid": booking_id})
            db.commit()
            return {"message": f"Booking {booking_id} approved"}
        except Exception as e:
            db.rollback()
            raise HTTPException(400, detail=str(e).split("\n")[0])
    else:
        db.execute(
            text("UPDATE event_booking SET status = :s WHERE booking_id = :b"),
            {"s": body.status, "b": booking_id},
        )
        db.commit()
        return {"message": f"Booking {booking_id} updated to {body.status}"}
