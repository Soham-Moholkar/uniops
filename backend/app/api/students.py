"""Student CRUD routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.relational import get_db
from app.auth.auth import get_current_user
from app.models.schemas import StudentCreate, StudentOut, StudentUpdate

router = APIRouter()


@router.get("", response_model=List[StudentOut])
def list_students(
    dept_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    q = """
        SELECT s.student_id, s.name, s.email, s.phone, s.dept_id,
               d.name AS dept_name, s.year, s.status, s.created_at
        FROM student s
        JOIN department d ON s.dept_id = d.dept_id
        WHERE 1=1
    """
    params: dict = {}
    if dept_id:
        q += " AND s.dept_id = :did"
        params["did"] = dept_id
    if status_filter:
        q += " AND s.status = :st"
        params["st"] = status_filter
    q += " ORDER BY s.student_id"

    rows = db.execute(text(q), params).fetchall()
    return [
        StudentOut(
            student_id=r[0], name=r[1], email=r[2], phone=r[3],
            dept_id=r[4], department_name=r[5], year=r[6],
            status=r[7], created_at=r[8],
        )
        for r in rows
    ]


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    row = db.execute(
        text("""
            SELECT s.student_id, s.name, s.email, s.phone, s.dept_id,
                   d.name, s.year, s.status, s.created_at
            FROM student s JOIN department d ON s.dept_id = d.dept_id
            WHERE s.student_id = :sid
        """),
        {"sid": student_id},
    ).fetchone()
    if not row:
        raise HTTPException(404, "Student not found")
    return StudentOut(
        student_id=row[0], name=row[1], email=row[2], phone=row[3],
        dept_id=row[4], department_name=row[5], year=row[6],
        status=row[7], created_at=row[8],
    )


@router.post("", response_model=StudentOut, status_code=201)
def create_student(body: StudentCreate, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    # Check department exists
    dept = db.execute(text("SELECT name FROM department WHERE dept_id = :d"), {"d": body.dept_id}).fetchone()
    if not dept:
        raise HTTPException(400, "Department not found")

    # Check duplicate email
    dup = db.execute(text("SELECT 1 FROM student WHERE email = :e"), {"e": body.email}).fetchone()
    if dup:
        raise HTTPException(409, "Student email already exists")

    result = db.execute(
        text("""
            INSERT INTO student (name, email, phone, dept_id, year)
            VALUES (:n, :e, :p, :d, :y)
            RETURNING student_id, created_at
        """),
        {"n": body.name, "e": body.email, "p": body.phone, "d": body.dept_id, "y": body.year},
    )
    db.commit()
    row = result.fetchone()
    return StudentOut(
        student_id=row[0], name=body.name, email=body.email,
        phone=body.phone, dept_id=body.dept_id, department_name=dept[0],
        year=body.year, status="active", created_at=row[1],
    )


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int, body: StudentUpdate,
    db: Session = Depends(get_db), _user: dict = Depends(get_current_user),
):
    sets = []
    params: dict = {"sid": student_id}
    if body.name is not None:
        sets.append("name = :n")
        params["n"] = body.name
    if body.phone is not None:
        sets.append("phone = :p")
        params["p"] = body.phone
    if body.dept_id is not None:
        sets.append("dept_id = :d")
        params["d"] = body.dept_id
    if body.year is not None:
        sets.append("year = :y")
        params["y"] = body.year
    if body.status is not None:
        sets.append("status = :st")
        params["st"] = body.status

    if not sets:
        raise HTTPException(400, "No fields to update")

    db.execute(text(f"UPDATE student SET {', '.join(sets)} WHERE student_id = :sid"), params)
    db.commit()
    return get_student(student_id, db, _user)


@router.get("/departments/list", response_model=List[dict])
def list_departments(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT dept_id, name FROM department ORDER BY dept_id")).fetchall()
    return [{"dept_id": r[0], "name": r[1]} for r in rows]
