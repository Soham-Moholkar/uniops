"""Auth routes: login & register."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.relational import get_db
from app.auth.auth import hash_password, verify_password, create_access_token
from app.models.schemas import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT user_id, email, password_hash, role FROM user_account WHERE email = :e"),
        {"e": body.email},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id, email, pw_hash, role = row

    # Try passlib verify first; fall back to pgcrypto check
    try:
        valid = verify_password(body.password, pw_hash)
    except Exception:
        valid = False

    if not valid:
        # Check via pgcrypto (passwords hashed in seed.sql with crypt())
        pg_check = db.execute(
            text("SELECT (password_hash = crypt(:pw, password_hash)) AS ok FROM user_account WHERE user_id = :uid"),
            {"pw": body.password, "uid": user_id},
        ).fetchone()
        if not pg_check or not pg_check[0]:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user_id), "role": role, "email": email})
    return TokenResponse(access_token=token, role=role, user_id=user_id)


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # Check duplicate
    exists = db.execute(
        text("SELECT 1 FROM user_account WHERE email = :e"), {"e": body.email}
    ).fetchone()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    pw_hash = hash_password(body.password)
    result = db.execute(
        text(
            "INSERT INTO user_account (email, password_hash, role) "
            "VALUES (:e, :p, :r) RETURNING user_id"
        ),
        {"e": body.email, "p": pw_hash, "r": body.role},
    )
    db.commit()
    user_id = result.fetchone()[0]
    token = create_access_token({"sub": str(user_id), "role": body.role, "email": body.email})
    return TokenResponse(access_token=token, role=body.role, user_id=user_id)
