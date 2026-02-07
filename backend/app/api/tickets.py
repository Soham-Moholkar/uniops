"""Helpdesk tickets routes — MongoDB backed."""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongo import tickets_collection
from app.auth.auth import get_current_user
from app.models.schemas import TicketCreate, TicketUpdate, CommentIn

router = APIRouter()


def _serialize(doc: dict) -> dict:
    """Convert Mongo doc to JSON-safe dict."""
    doc["_id"] = str(doc["_id"])
    return doc


def _next_ticket_id() -> str:
    """Auto-increment ticketId like TKT-011."""
    last = tickets_collection.find_one(sort=[("ticketId", -1)])
    if last:
        num = int(last["ticketId"].split("-")[1]) + 1
    else:
        num = 1
    return f"TKT-{num:03d}"


@router.get("")
def list_tickets(
    status: Optional[str] = None,
    category: Optional[str] = None,
    student_id: Optional[int] = None,
    _user: dict = Depends(get_current_user),
):
    query: dict = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if student_id:
        query["studentId"] = student_id

    docs = tickets_collection.find(query).sort("createdAt", -1)
    return [_serialize(d) for d in docs]


@router.get("/{ticket_id}")
def get_ticket(ticket_id: str, _user: dict = Depends(get_current_user)):
    doc = tickets_collection.find_one({"ticketId": ticket_id})
    if not doc:
        raise HTTPException(404, "Ticket not found")
    return _serialize(doc)


@router.post("", status_code=201)
def create_ticket(body: TicketCreate, _user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "ticketId": _next_ticket_id(),
        "studentId": body.studentId,
        "studentName": body.studentName,
        "studentEmail": body.studentEmail,
        "category": body.category,
        "title": body.title,
        "description": body.description,
        "priority": body.priority,
        "status": "open",
        "createdAt": now,
        "updatedAt": now,
        "tags": body.tags,
        "comments": [],
        "attachments": [a.model_dump() for a in body.attachments],
    }
    result = tickets_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.patch("/{ticket_id}")
def update_ticket(ticket_id: str, body: TicketUpdate, _user: dict = Depends(get_current_user)):
    update: dict = {"updatedAt": datetime.now(timezone.utc)}
    if body.status:
        update["status"] = body.status
        if body.status in ("resolved", "closed"):
            update["resolvedAt"] = datetime.now(timezone.utc)
    if body.priority:
        update["priority"] = body.priority
    if body.tags is not None:
        update["tags"] = body.tags

    result = tickets_collection.update_one({"ticketId": ticket_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Ticket not found")
    return {"message": f"Ticket {ticket_id} updated"}


@router.post("/{ticket_id}/comment")
def add_comment(ticket_id: str, body: CommentIn, _user: dict = Depends(get_current_user)):
    comment = {
        "author": _user["email"],
        "role": _user["role"],
        "text": body.text,
        "createdAt": datetime.now(timezone.utc),
    }
    result = tickets_collection.update_one(
        {"ticketId": ticket_id},
        {
            "$push": {"comments": comment},
            "$set": {"updatedAt": datetime.now(timezone.utc)},
        },
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Ticket not found")
    return {"message": "Comment added", "comment": comment}


@router.delete("/{ticket_id}")
def delete_ticket(ticket_id: str, _user: dict = Depends(get_current_user)):
    result = tickets_collection.delete_one({"ticketId": ticket_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Ticket not found")
    return {"message": f"Ticket {ticket_id} deleted"}
