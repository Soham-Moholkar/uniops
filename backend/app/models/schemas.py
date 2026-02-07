"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ──
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    role: str = "student"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int


class UserOut(BaseModel):
    user_id: int
    email: str
    role: str


# ── Department ──
class DepartmentOut(BaseModel):
    dept_id: int
    name: str


# ── Student ──
class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str
    phone: Optional[str] = None
    dept_id: int
    year: int = Field(ge=1, le=5)


class StudentOut(BaseModel):
    student_id: int
    name: str
    email: str
    phone: Optional[str]
    dept_id: int
    department_name: Optional[str] = None
    year: int
    status: str
    created_at: datetime


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    dept_id: Optional[int] = None
    year: Optional[int] = None
    status: Optional[str] = None


# ── Course ──
class CourseOut(BaseModel):
    course_id: int
    dept_id: int
    code: str
    name: str
    credits: int


class EnrollRequest(BaseModel):
    student_id: int
    course_id: int
    semester: str = Field(min_length=3, max_length=10)


class EnrollmentOut(BaseModel):
    enroll_id: int
    student_id: int
    course_id: int
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    semester: str
    grade: Optional[str] = None


# ── Library ──
class BookOut(BaseModel):
    book_id: int
    isbn: str
    title: str
    author: str
    copies_total: int
    copies_avail: int
    book_type: str


class BookCreate(BaseModel):
    isbn: str
    title: str
    author: str
    copies_total: int = Field(ge=1)
    book_type: str = "circulating"


class IssueRequest(BaseModel):
    student_id: int
    book_id: int


class ReturnRequest(BaseModel):
    issue_id: int


class BookIssueOut(BaseModel):
    issue_id: int
    student_id: int
    student_name: Optional[str] = None
    book_id: int
    book_title: Optional[str] = None
    issued_at: datetime
    due_at: datetime
    returned_at: Optional[datetime] = None
    fine_amount: float


# ── Room ──
class RoomOut(BaseModel):
    room_id: int
    name: str
    building: str
    capacity: int


# ── Booking ──
class BookingCreate(BaseModel):
    room_id: int
    organizer_student_id: int
    start_time: datetime
    end_time: datetime
    purpose: str = Field(min_length=5, max_length=300)


class BookingOut(BaseModel):
    booking_id: int
    room_id: int
    room_name: Optional[str] = None
    organizer_student_id: int
    organizer_name: Optional[str] = None
    start_time: datetime
    end_time: datetime
    purpose: str
    status: str
    created_at: datetime


class BookingUpdate(BaseModel):
    status: str  # approved / rejected / cancelled


# ── Payment ──
class PaymentOut(BaseModel):
    payment_id: int
    student_id: int
    student_name: Optional[str] = None
    amount: float
    type: str
    paid_at: datetime
    ref: Optional[str] = None


# ── Ticket (MongoDB) ──
class CommentIn(BaseModel):
    text: str = Field(min_length=1)


class AttachmentIn(BaseModel):
    filename: str
    contentType: str
    size: int


class TicketCreate(BaseModel):
    studentId: int
    studentName: str
    studentEmail: str
    category: str
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10)
    priority: str = "medium"
    tags: List[str] = []
    attachments: List[AttachmentIn] = []


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = None
