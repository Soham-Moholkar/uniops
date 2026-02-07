"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import auth_routes, students, courses, library, rooms, bookings, tickets, payments

settings = get_settings()

app = FastAPI(
    title="UniOps DB — Campus Operations Suite",
    description="RDBMS (PostgreSQL) + NoSQL (MongoDB) campus management API",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(library.router, prefix="/api/library", tags=["Library"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["Tickets (MongoDB)"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "project": "UniOps DB - Campus Operations Suite"}
