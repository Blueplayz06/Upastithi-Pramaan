"""
Students Router
All endpoints require a valid JWT with role = "student".
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from database import get_supabase, safe_data
from dependencies import require_role
from models.student import DeviceChangeRequest, DisputeCreate, MarkAttendanceRequest
from datetime import datetime, timezone

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

    student_res = db.table("students").select("semester").eq("id", user["sub"]).maybe_single().execute()
    student_data = safe_data(student_res)
    if not student_data:
        raise HTTPException(404, "Student not found")
        
    student_semester = student_data.get("semester", "5")

    # 1. Fetch ALL subjects in student's semester
    subjects_res = db.table("subjects").select("id, code, name, faculty:faculty_id(name)").eq("semester", student_semester).execute()
    all_subjects = safe_data(subjects_res) or []

    summaries = {}
    subj_id_to_code = {}
    for subj in all_subjects:
        code = subj.get("code", "UNKNOWN")
        subj_id_to_code[subj["id"]] = code
        fac = subj.get("faculty")
        faculty_name = fac.get("name", "") if isinstance(fac, dict) else ""
        summaries[code] = {
            "subject_code": code,
            "subject_name": subj.get("name", code),
            "faculty":      faculty_name,
            "total":        0,
            "attended":     0,
        }

    # 2. Fetch all sessions for these subjects to get total classes
    subject_ids = list(subj_id_to_code.keys())
    if subject_ids:
        sessions_res = db.table("sessions").select("id, subject_id").in_("subject_id", subject_ids).execute()
        all_sessions = safe_data(sessions_res) or []
        for sess in all_sessions:
            code = subj_id_to_code.get(sess["subject_id"])
            if code in summaries:
                summaries[code]["total"] += 1

    # 3. Fetch attendance records for the student
    att_res = db.table("attendance_records").select(
        "face_verified, mac_verified, sessions!inner(subject_id)"
    ).eq("student_id", user["sub"]).execute()
    records = safe_data(att_res) or []

    for rec in records:
        sess = rec.get("sessions")
        if not sess:
            continue
        code = subj_id_to_code.get(sess.get("subject_id"))
        if code and code in summaries:
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


@router.post("/me/attendance", status_code=201)
def mark_attendance(body: MarkAttendanceRequest, user: dict = Depends(student_only)):
    db = get_supabase()
    
    # 1. Verify session is active and fetch 2FA data
    session_res = db.table("sessions").select(
        "id, active, twofa_code, twofa_code_expires_at"
    ).eq("id", body.session_id).maybe_single().execute()
    session_data = safe_data(session_res)
    if not session_data:
        raise HTTPException(404, "Session not found")
    if not session_data.get("active"):
        raise HTTPException(400, "Session is no longer active")

    # 2. Validate 2FA code
    stored_code = session_data.get("twofa_code")
    expires_at_str = session_data.get("twofa_code_expires_at")
    if not stored_code:
        raise HTTPException(400, "No 2FA code is set for this session. Ask your faculty to check the session.")
    if not body.twofa_code:
        raise HTTPException(422, "2FA code is required to mark attendance.")
    if body.twofa_code.strip() != stored_code:
        raise HTTPException(403, "Invalid 2FA code. Please check the code displayed by your faculty.")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(403, "The 2FA code has expired. Ask your faculty for the new code.")

    # 3. Verify MAC address belongs to student and is approved
    device_res = db.table("devices").select("mac, status").eq(
        "student_id", user["sub"]
    ).eq("mac", body.mac_address).maybe_single().execute()
    device_data = safe_data(device_res)
    
    if not device_data:
        raise HTTPException(400, "Unrecognized device MAC address")
    if device_data.get("status") != "approved":
        raise HTTPException(403, "Device is not approved for attendance")

    # 4. Check if attendance already marked
    existing = safe_data(
        db.table("attendance_records").select("id").eq(
            "session_id", body.session_id
        ).eq("student_id", user["sub"]).maybe_single().execute()
    )
    if existing:
        raise HTTPException(409, "Attendance already marked for this session")

    # Face verification logic
    if not getattr(body, "image_base64", None):
        raise HTTPException(400, "Face scan is required to mark attendance.")

    # Decode image, run through face embedding, compare with DB.
    # Mocking for now as the actual model requires heavy dependencies:
    import random
    # 80% chance of successful match
    is_match = random.random() > 0.2
    if not is_match:
        raise HTTPException(403, "Face verification failed. Please try again in better lighting.")

    face_verified = True
    confidence = round(random.uniform(70.0, 99.9), 2)

    # 5. Insert attendance record
    now_iso = datetime.now(timezone.utc).isoformat()
    db.table("attendance_records").insert({
        "session_id": body.session_id,
        "student_id": user["sub"],
        "mac_verified": True,
        "face_verified": face_verified,
        "confidence": confidence,
        "marked_at": now_iso
    }).execute()

    return {"message": "Attendance marked successfully"}


# ── Active Session Checkout ───────────────────────────────────────────────────
@router.get("/me/active-session")
def get_my_active_session(user: dict = Depends(student_only)):
    db = get_supabase()

    # Get student semester
    student_res = db.table("students").select("semester").eq("id", user["sub"]).maybe_single().execute()
    student_data = safe_data(student_res)
    if not student_data:
        raise HTTPException(404, "Student not found")
        
    student_semester = student_data.get("semester", "5")

    # Get subjects for semester
    subjects_res = db.table("subjects").select("id, code, name").eq("semester", student_semester).execute()
    subjects = safe_data(subjects_res) or []
    subject_ids = [s["id"] for s in subjects]
    
    if not subject_ids:
        return None

    # Get active sessions for those subjects
    sessions_res = db.table("sessions").select(
        "id, started_at, subject_id, faculty:faculty_id(name)"
    ).in_("subject_id", subject_ids).eq("active", True).execute()
    
    active_sessions = safe_data(sessions_res) or []
    
    # Filter out sessions where attendance is already marked
    for sess in active_sessions:
        existing = safe_data(
            db.table("attendance_records").select("id").eq(
                "session_id", sess["id"]
            ).eq("student_id", user["sub"]).maybe_single().execute()
        )
        if not existing:
            # Found an active session that hasn't been attended yet
            subject = next((s for s in subjects if s["id"] == sess["subject_id"]), None)
            fac_name = sess.get("faculty", {}).get("name") if isinstance(sess.get("faculty"), dict) else ""
            return {
                "session_id": sess["id"],
                "subject_code": subject["code"] if subject else "Unknown",
                "subject_name": subject["name"] if subject else "Unknown",
                "faculty_name": fac_name,
                "started_at": sess["started_at"]
            }
            
    return None



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

    student_res = db.table("students").select("semester").eq("id", user["sub"]).maybe_single().execute()
    student_data = safe_data(student_res)
    if not student_data:
        raise HTTPException(404, "Student not found")
        
    student_semester = student_data.get("semester", "5")
    
    # Get subjects
    subjects_res = db.table("subjects").select("id").eq("semester", student_semester).execute()
    subject_ids = [s["id"] for s in (safe_data(subjects_res) or [])]

    # Get all sessions in this month for these subjects
    all_sessions = []
    if subject_ids:
        sessions_res = db.table("sessions").select("id, started_at").in_("subject_id", subject_ids).gte("started_at", start).lt("started_at", end).execute()
        all_sessions = safe_data(sessions_res) or []

    # Get student's attendance records for the month
    records = safe_data(
        db.table("attendance_records").select(
            "face_verified, mac_verified, session_id"
        ).eq("student_id", user["sub"]).execute()
    ) or []
    
    # Create a map of session_id -> present (bool)
    att_map = {}
    for r in records:
        att_map[r["session_id"]] = bool(r.get("face_verified") and r.get("mac_verified"))
        
    day_map: dict = {}
    for sess in all_sessions:
        started = sess.get("started_at", "")
        if not started:
            continue
        day = int(started[8:10])
        present = att_map.get(sess["id"], False)
        
        if day not in day_map:
            day_map[day] = "absent" # default to absent if there is a session
            
        if present:
            day_map[day] = "present" # present overrides absent if there are multiple sessions

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
