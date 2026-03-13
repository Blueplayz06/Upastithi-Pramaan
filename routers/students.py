"""
Students Router
All endpoints require a valid JWT with role = "student".
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from database import get_supabase, safe_data
from dependencies import require_role
from models.student import DeviceChangeRequest, DisputeCreate

router = APIRouter()
student_only = require_role("student")


# ── Profile ───────────────────────────────────────────────────────────────────
@router.get("/me")
def get_my_profile(user: dict = Depends(student_only)):
    db = get_supabase()
    res = db.table("students").select(
        "id, roll, name, division, semester, email, department, institution"
    ).eq("id", user["sub"]).maybe_single().execute()
    data = safe_data(res)
    if not data:
        raise HTTPException(404, "Student not found")
    return data


# ── Attendance summary ────────────────────────────────────────────────────────
@router.get("/me/attendance")
def get_my_attendance(user: dict = Depends(student_only)):
    db = get_supabase()
    res = db.table("attendance_records").select(
        "*, sessions!inner(subject_id, subjects!inner(code, name, faculty:faculty_id(name)))"
    ).eq("student_id", user["sub"]).execute()

    records = safe_data(res) or []

    summaries: dict = {}
    for rec in records:
        sess = rec.get("sessions", {})
        subj = (sess.get("subjects") or {})
        code = subj.get("code", "UNKNOWN")
        if code not in summaries:
            faculty_name = ""
            fac = subj.get("faculty")
            if fac:
                faculty_name = fac.get("name", "")
            summaries[code] = {
                "subject_code": code,
                "subject_name": subj.get("name", code),
                "faculty":      faculty_name,
                "total":        0,
                "attended":     0,
            }
        summaries[code]["total"] += 1
        if rec.get("face_verified") and rec.get("mac_verified"):
            summaries[code]["attended"] += 1

    result = []
    for s in summaries.values():
        pct = round((s["attended"] / s["total"]) * 100, 1) if s["total"] else 0
        result.append({**s, "percentage": pct})

    overall = round(
        sum(x["percentage"] for x in result) / len(result), 1
    ) if result else 0

    return {"overall_percentage": overall, "subjects": result}


# ── Calendar ──────────────────────────────────────────────────────────────────
@router.get("/me/calendar")
def get_my_calendar(
    month: int = Query(default=2, ge=1, le=12),
    year:  int = Query(default=2026, ge=2020, le=2100),
    user: dict = Depends(student_only),
):
    db = get_supabase()
    start = f"{year}-{month:02d}-01"
    if month == 12:
        end = f"{year+1}-01-01"
    else:
        end = f"{year}-{month+1:02d}-01"

    records = safe_data(
        db.table("attendance_records").select(
            "face_verified, mac_verified, sessions!inner(started_at)"
        ).eq("student_id", user["sub"]).gte(
            "sessions.started_at", start
        ).lt("sessions.started_at", end).execute()
    ) or []

    day_map: dict = {}
    for rec in records:
        sess = rec.get("sessions", {})
        started = sess.get("started_at", "")
        if not started:
            continue
        day = int(started[8:10])
        present = rec.get("face_verified") and rec.get("mac_verified")
        if day not in day_map:
            day_map[day] = "absent"
        if present:
            day_map[day] = "present"

    import calendar as _cal
    days_in_month = _cal.monthrange(year, month)[1]
    result = []
    for d in range(1, days_in_month + 1):
        status = day_map.get(d, "no-class")
        result.append({"day": d, "month": month, "year": year, "status": status})

    return result


# ── Subjects detail ───────────────────────────────────────────────────────────
@router.get("/me/subjects")
def get_my_subjects(user: dict = Depends(student_only)):
    return get_my_attendance(user)


# ── Device info ───────────────────────────────────────────────────────────────
@router.get("/me/device")
def get_my_device(user: dict = Depends(student_only)):
    db = get_supabase()
    res = db.table("devices").select("*").eq("student_id", user["sub"]).maybe_single().execute()
    data = safe_data(res)
    if not data:
        return {"mac": None, "status": "not_registered"}
    return data


# ── Device change request ─────────────────────────────────────────────────────
@router.post("/me/device-request", status_code=201)
def request_device_change(body: DeviceChangeRequest, user: dict = Depends(student_only)):
    db = get_supabase()
    db.table("devices").insert({
        "mac":         body.new_mac,
        "device_name": body.device_name,
        "student_id":  user["sub"],
        "status":      "pending",
    }).execute()
    db.table("notifications").insert({
        "user_id": user["sub"],
        "type":    "info",
        "message": f"Device change request submitted — MAC {body.new_mac} — pending approval",
    }).execute()
    db.table("audit_logs").insert({
        "actor_id": user["sub"],
        "action":   "DEVICE_CHANGE_REQUEST",
        "details":  f"New MAC: {body.new_mac}",
    }).execute()
    return {"message": "Device change request submitted successfully"}


# ── Notifications ─────────────────────────────────────────────────────────────
@router.get("/me/notifications")
def get_my_notifications(user: dict = Depends(student_only)):
    db = get_supabase()
    res = db.table("notifications").select("*").eq(
        "user_id", user["sub"]
    ).order("created_at", desc=True).limit(50).execute()
    return safe_data(res) or []


@router.patch("/me/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, user: dict = Depends(student_only)):
    db = get_supabase()
    db.table("notifications").update({"read": True}).eq("id", notif_id).eq(
        "user_id", user["sub"]
    ).execute()
    return {"message": "Marked as read"}


# ── Disputes ──────────────────────────────────────────────────────────────────
@router.post("/me/disputes", status_code=201)
def submit_dispute(body: DisputeCreate, user: dict = Depends(student_only)):
    db = get_supabase()
    rec = db.table("disputes").insert({
        "student_id": user["sub"],
        "subject_id": body.subject_id,
        "date":       str(body.date),
        "message":    body.message,
        "status":     "pending",
    }).execute()
    data = safe_data(rec)
    return data[0] if data else {"message": "Dispute submitted"}


@router.get("/me/disputes")
def list_my_disputes(user: dict = Depends(student_only)):
    db = get_supabase()
    res = db.table("disputes").select(
        "*, subjects!inner(code, name)"
    ).eq("student_id", user["sub"]).order("created_at", desc=True).execute()
    return safe_data(res) or []


# ── Export CSV ────────────────────────────────────────────────────────────────
@router.get("/me/export")
def export_my_attendance(user: dict = Depends(student_only)):
    from utils.reports import list_to_csv
    att = get_my_attendance(user)
    csv_str = list_to_csv(
        att["subjects"],
        ["subject_code", "subject_name", "faculty", "total", "attended", "percentage"],
    )
    return StreamingResponse(
        io.StringIO(csv_str),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=my_attendance.csv"},
    )
