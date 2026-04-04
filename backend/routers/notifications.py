"""
Notifications Router — accessible by all authenticated users.

GET   /notifications             — list notifications for current user
PATCH /notifications/{id}/read   — mark a notification as read
DELETE /notifications/{id}       — delete a notification
"""
from fastapi import APIRouter, Depends, HTTPException

from database import get_supabase, safe_data
from dependencies import get_current_user

router = APIRouter()


@router.get("/")
def list_notifications(user: dict = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("notifications").select("*").eq(
        "user_id", user["sub"]
    ).order("created_at", desc=True).limit(50).execute()
    return safe_data(res) or []


@router.patch("/{notif_id}/read")
def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("notifications").select("id, user_id").eq(
        "id", notif_id
    ).maybe_single().execute()
    d = safe_data(res)
    if not d:
        raise HTTPException(404, "Notification not found")
    if d["user_id"] != user["sub"]:
        raise HTTPException(403, "Access denied")
    db.table("notifications").update({"read": True}).eq("id", notif_id).execute()
    return {"message": "Marked as read"}


@router.delete("/{notif_id}", status_code=204)
def delete_notification(notif_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("notifications").select("id, user_id").eq(
        "id", notif_id
    ).maybe_single().execute()
    d2 = safe_data(res)
    if not d2:
        raise HTTPException(404, "Notification not found")
    if d2["user_id"] != user["sub"]:
        raise HTTPException(403, "Access denied")
    db.table("notifications").delete().eq("id", notif_id).execute()
    return
