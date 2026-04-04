"""
Disputes Router — accessible by both students and admins.

GET  /disputes         — list all disputes (admin) or own disputes (student)
POST /disputes         — submit a dispute (student)
PATCH /disputes/{id}/resolve — resolve (admin)
PATCH /disputes/{id}/reject  — reject (admin)
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from database import get_supabase, safe_data
from dependencies import get_current_user
from models.student import DisputeCreate

router = APIRouter()


@router.get("/")
def list_disputes(user: dict = Depends(get_current_user)):
    db = get_supabase()
    role = user.get("role")
    q = db.table("disputes").select(
        "*, students!inner(roll, name), subjects!inner(code, name)"
    ).order("created_at", desc=True)
    if role == "student":
        q = q.eq("student_id", user["sub"])
    res = q.execute()
    return safe_data(res) or []


@router.post("/", status_code=201)
def submit_dispute(body: DisputeCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "student":
        raise HTTPException(403, "Only students can submit disputes")
    db = get_supabase()
    rec = db.table("disputes").insert({
        "student_id": user["sub"],
        "subject_id": body.subject_id,
        "date":       str(body.date),
        "message":    body.message,
        "status":     "pending",
    }).execute()
    db.table("audit_logs").insert({
        "actor_id": user["sub"],
        "action":   "DISPUTE_SUBMIT",
        "details":  f"subject_id={body.subject_id} date={body.date}",
    }).execute()
    d = safe_data(rec)
    return d[0] if d else {"message": "Dispute submitted"}


@router.patch("/{dispute_id}/resolve")
def resolve_dispute(dispute_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Only admin can resolve disputes")
    db = get_supabase()
    dispute = db.table("disputes").select("student_id").eq(
        "id", dispute_id
    ).maybe_single().execute()
    d = safe_data(dispute)
    if not d:
        raise HTTPException(404, "Dispute not found")
    db.table("disputes").update({"status": "resolved"}).eq("id", dispute_id).execute()
    db.table("notifications").insert({
        "user_id": d["student_id"],
        "type":    "success",
        "message": f"Your dispute ({dispute_id}) has been resolved.",
    }).execute()
    return {"message": "Dispute resolved"}


@router.patch("/{dispute_id}/reject")
def reject_dispute(dispute_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Only admin can reject disputes")
    db = get_supabase()
    dispute = db.table("disputes").select("student_id").eq(
        "id", dispute_id
    ).maybe_single().execute()
    d2 = safe_data(dispute)
    if not d2:
        raise HTTPException(404, "Dispute not found")
    db.table("disputes").update({"status": "rejected"}).eq("id", dispute_id).execute()
    db.table("notifications").insert({
        "user_id": d2["student_id"],
        "type":    "warning",
        "message": f"Your dispute ({dispute_id}) was rejected.",
    }).execute()
    return {"message": "Dispute rejected"}
