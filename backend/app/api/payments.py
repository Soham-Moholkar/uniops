"""Payment listing routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.relational import get_db
from app.auth.auth import get_current_user
from app.models.schemas import PaymentOut

router = APIRouter()


@router.get("", response_model=List[PaymentOut])
def list_payments(
    student_id: Optional[int] = None,
    payment_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    q = """
        SELECT p.payment_id, p.student_id, s.name,
               p.amount, p.type, p.paid_at, p.ref
        FROM payment p
        JOIN student s ON p.student_id = s.student_id
        WHERE 1=1
    """
    params: dict = {}
    if student_id:
        q += " AND p.student_id = :sid"
        params["sid"] = student_id
    if payment_type:
        q += " AND p.type = :pt"
        params["pt"] = payment_type
    q += " ORDER BY p.paid_at DESC"

    rows = db.execute(text(q), params).fetchall()
    return [
        PaymentOut(
            payment_id=r[0], student_id=r[1], student_name=r[2],
            amount=float(r[3]), type=r[4], paid_at=r[5], ref=r[6],
        )
        for r in rows
    ]
