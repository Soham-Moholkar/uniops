"""Library: books CRUD, issue, return."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from app.db.relational import get_db
from app.auth.auth import get_current_user
from app.models.schemas import BookOut, BookCreate, IssueRequest, ReturnRequest, BookIssueOut

router = APIRouter()


@router.get("/books", response_model=List[BookOut])
def list_books(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    rows = db.execute(
        text("SELECT book_id, isbn, title, author, copies_total, copies_avail, book_type FROM library_book ORDER BY title")
    ).fetchall()
    return [
        BookOut(book_id=r[0], isbn=r[1], title=r[2], author=r[3],
                copies_total=r[4], copies_avail=r[5], book_type=r[6])
        for r in rows
    ]


@router.post("/books", response_model=BookOut, status_code=201)
def create_book(body: BookCreate, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    dup = db.execute(text("SELECT 1 FROM library_book WHERE isbn = :i"), {"i": body.isbn}).fetchone()
    if dup:
        raise HTTPException(409, "ISBN already exists")

    result = db.execute(
        text("""
            INSERT INTO library_book (isbn, title, author, copies_total, copies_avail, book_type)
            VALUES (:i, :t, :a, :ct, :ct, :bt) RETURNING book_id
        """),
        {"i": body.isbn, "t": body.title, "a": body.author, "ct": body.copies_total, "bt": body.book_type},
    )
    db.commit()
    bid = result.fetchone()[0]
    return BookOut(
        book_id=bid, isbn=body.isbn, title=body.title, author=body.author,
        copies_total=body.copies_total, copies_avail=body.copies_total, book_type=body.book_type,
    )


@router.post("/issue", response_model=dict)
def issue_book(body: IssueRequest, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Issue a book using the stored procedure."""
    try:
        db.execute(
            text("CALL issue_book(:sid, :bid)"),
            {"sid": body.student_id, "bid": body.book_id},
        )
        db.commit()
        return {"message": f"Book {body.book_id} issued to student {body.student_id}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(400, detail=str(e).split("\n")[0])


@router.post("/return", response_model=dict)
def return_book(body: ReturnRequest, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Return a book using the stored procedure."""
    try:
        db.execute(text("CALL return_book(:iid)"), {"iid": body.issue_id})
        db.commit()

        row = db.execute(
            text("SELECT fine_amount FROM book_issue WHERE issue_id = :iid"),
            {"iid": body.issue_id},
        ).fetchone()
        fine = row[0] if row else 0
        return {"message": f"Book returned for issue {body.issue_id}", "fine": float(fine)}
    except Exception as e:
        db.rollback()
        raise HTTPException(400, detail=str(e).split("\n")[0])


@router.get("/issues", response_model=List[BookIssueOut])
def list_issues(
    student_id: int = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    q = """
        SELECT bi.issue_id, bi.student_id, s.name, bi.book_id, lb.title,
               bi.issued_at, bi.due_at, bi.returned_at, bi.fine_amount
        FROM book_issue bi
        JOIN student s ON bi.student_id = s.student_id
        JOIN library_book lb ON bi.book_id = lb.book_id
        WHERE 1=1
    """
    params: dict = {}
    if student_id:
        q += " AND bi.student_id = :sid"
        params["sid"] = student_id
    if active_only:
        q += " AND bi.returned_at IS NULL"
    q += " ORDER BY bi.issued_at DESC"

    rows = db.execute(text(q), params).fetchall()
    return [
        BookIssueOut(
            issue_id=r[0], student_id=r[1], student_name=r[2],
            book_id=r[3], book_title=r[4], issued_at=r[5],
            due_at=r[6], returned_at=r[7], fine_amount=float(r[8]),
        )
        for r in rows
    ]
