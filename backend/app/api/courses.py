"""Course and enrollment routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from app.db.relational import get_db
from app.auth.auth import get_current_user
from app.models.schemas import CourseOut, EnrollRequest, EnrollmentOut

router = APIRouter()


@router.get("", response_model=List[CourseOut])
def list_courses(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    rows = db.execute(
        text("SELECT course_id, dept_id, code, name, credits FROM course ORDER BY code")
    ).fetchall()
    return [CourseOut(course_id=r[0], dept_id=r[1], code=r[2], name=r[3], credits=r[4]) for r in rows]


@router.post("/enroll", response_model=EnrollmentOut, status_code=201)
def enroll_student(body: EnrollRequest, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    # Validate student
    stu = db.execute(text("SELECT 1 FROM student WHERE student_id = :s"), {"s": body.student_id}).fetchone()
    if not stu:
        raise HTTPException(404, "Student not found")

    # Validate course
    crs = db.execute(
        text("SELECT code, name FROM course WHERE course_id = :c"), {"c": body.course_id}
    ).fetchone()
    if not crs:
        raise HTTPException(404, "Course not found")

    # Check duplicate
    dup = db.execute(
        text("""
            SELECT 1 FROM enrollment
            WHERE student_id = :s AND course_id = :c AND semester = :sem
        """),
        {"s": body.student_id, "c": body.course_id, "sem": body.semester},
    ).fetchone()
    if dup:
        raise HTTPException(409, "Already enrolled in this course for this semester")

    result = db.execute(
        text("""
            INSERT INTO enrollment (student_id, course_id, semester)
            VALUES (:s, :c, :sem) RETURNING enroll_id
        """),
        {"s": body.student_id, "c": body.course_id, "sem": body.semester},
    )
    db.commit()
    eid = result.fetchone()[0]
    return EnrollmentOut(
        enroll_id=eid, student_id=body.student_id, course_id=body.course_id,
        course_code=crs[0], course_name=crs[1], semester=body.semester, grade=None,
    )


@router.get("/enrollments/{student_id}", response_model=List[EnrollmentOut])
def student_enrollments(student_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    rows = db.execute(
        text("""
            SELECT e.enroll_id, e.student_id, e.course_id,
                   c.code, c.name, e.semester, e.grade
            FROM enrollment e
            JOIN course c ON e.course_id = c.course_id
            WHERE e.student_id = :s
            ORDER BY e.semester, c.code
        """),
        {"s": student_id},
    ).fetchall()
    return [
        EnrollmentOut(
            enroll_id=r[0], student_id=r[1], course_id=r[2],
            course_code=r[3], course_name=r[4], semester=r[5], grade=r[6],
        )
        for r in rows
    ]
