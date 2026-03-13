"""
Faculty Router
All endpoints require JWT with role = "faculty".

GET  /faculty/me                              — profile
GET  /faculty/subjects                        — subjects assigned to this faculty
POST /faculty/sessions/start                  — start an attendance session
POST /faculty/sessions/{id}/end               — end a session
GET  /faculty/sessions/{id}/students          — live student list for a session
PATCH /faculty/sessions/{id}/override         — manual override for a student
GET  /faculty/analytics                       — 30-day trend, defaulters, today's summary
GET  /faculty/reports/{type}                  — export CSV report
GET  /faculty/sessions/active                 — get currently active session (if any)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import io
from datetime import datetime, timezone

from database import get_supabase, safe_data
from dependencies import require_role
from models.faculty import SessionStart, AttendanceOverride

router = APIRouter()
faculty_only = require_role("faculty")


# ── Profile ───────────────────────────────────────────────────────────────────
@router.get("/me")
def get_my_profile(user: dict = Depends(faculty_only)):
    db = get_supabase()
    res = db.table("faculty").select(
        "id, emp_id, name, department, subjects"
    ).eq("id", user["sub"]).maybe_single().execute()
    data = safe_data(res)
    if not data:
        raise HTTPException(404, "Faculty not found")
    return data


# ── Subjects ──────────────────────────────────────────────────────────────────
@router.get("/subjects")
def get_my_subjects(user: dict = Depends(faculty_only)):
    db = get_supabase()
    res = db.table("subjects").select("*").eq("faculty_id", user["sub"]).execute()
    return safe_data(res) or []


# ── Sessions ──────────────────────────────────────────────────────────────────
@router.get("/sessions/active")
def get_active_session(user: dict = Depends(faculty_only)):
    db = get_supabase()
    res = db.table("sessions").select(
        "*, subjects!inner(code, name)"
    ).eq("faculty_id", user["sub"]).eq("active", True).maybe_single().execute()
    return safe_data(res)


@router.post("/sessions/start", status_code=201)
def start_session(body: SessionStart, user: dict = Depends(faculty_only)):
    db = get_supabase()
    # Only one active session at a time per faculty
    existing = db.table("sessions").select("id").eq(
        "faculty_id", user["sub"]
    ).eq("active", True).execute()
    if safe_data(existing):
        raise HTTPException(400, "You already have an active session. End it before starting a new one.")

    res = db.table("sessions").insert({
        "subject_id":  body.subject_id,
        "faculty_id":  user["sub"],
        "started_at":  datetime.now(timezone.utc).isoformat(),
        "active":      True,
    }).execute()

    db.table("audit_logs").insert({
        "actor_id": user["sub"],
        "action":   "SESSION_START",
        "details":  f"subject_id={body.subject_id}",
    }).execute()

    d = safe_data(res)
    return d[0] if d else {"message": "Session started"}


@router.post("/sessions/{session_id}/end")
def end_session(session_id: str, user: dict = Depends(faculty_only)):
    db = get_supabase()
    sess = db.table("sessions").select("id, faculty_id").eq("id", session_id).maybe_single().execute()
    sess_data = safe_data(sess)
    if not sess_data:
        raise HTTPException(404, "Session not found")
    if sess_data["faculty_id"] != user["sub"]:
        raise HTTPException(403, "Not your session")

    db.table("sessions").update({
        "active":   False,
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", session_id).execute()

    db.table("audit_logs").insert({
        "actor_id": user["sub"],
        "action":   "SESSION_END",
        "details":  f"session_id={session_id}",
    }).execute()
    return {"message": "Session ended"}


@router.get("/sessions/{session_id}/students")
def get_session_students(session_id: str, user: dict = Depends(faculty_only)):
    db = get_supabase()
    # Verify session belongs to this faculty
    sess = db.table("sessions").select("faculty_id").eq("id", session_id).maybe_single().execute()
    sess_data = safe_data(sess)
    if not sess_data or sess_data["faculty_id"] != user["sub"]:
        raise HTTPException(403, "Access denied")

    res = db.table("attendance_records").select(
        "*, students!inner(roll, name)"
    ).eq("session_id", session_id).execute()

    rows = []
    for rec in (safe_data(res) or []):
        stu = rec.get("students", {})
        rows.append({
            "roll":          stu.get("roll"),
            "name":          stu.get("name"),
            "face_verified": rec.get("face_verified", False),
            "mac_verified":  rec.get("mac_verified", False),
            "confidence":    rec.get("confidence"),
            "marked_at":     rec.get("marked_at"),
        })
    return rows


@router.patch("/sessions/{session_id}/override")
def override_attendance(
    session_id: str,
    body: AttendanceOverride,
    user: dict = Depends(faculty_only),
):
    db = get_supabase()
    sess = db.table("sessions").select("faculty_id").eq("id", session_id).maybe_single().execute()
    sess_data = safe_data(sess)
    if not sess_data or sess_data["faculty_id"] != user["sub"]:
        raise HTTPException(403, "Access denied")

    # Check if a record already exists
    existing = db.table("attendance_records").select("id").eq(
        "session_id", session_id
    ).eq("student_id", body.student_id).maybe_single().execute()

    now = datetime.now(timezone.utc).isoformat()
    existing_data = safe_data(existing)
    if existing_data:
        db.table("attendance_records").update({
            "face_verified": body.present,
            "mac_verified":  body.present,
            "marked_at":     now if body.present else None,
        }).eq("id", existing_data["id"]).execute()
    else:
        db.table("attendance_records").insert({
            "session_id":    session_id,
            "student_id":    body.student_id,
            "face_verified": body.present,
            "mac_verified":  body.present,
            "marked_at":     now if body.present else None,
        }).execute()

    db.table("audit_logs").insert({
        "actor_id": user["sub"],
        "action":   "ATTENDANCE_OVERRIDE",
        "details":  f"student_id={body.student_id} present={body.present} session_id={session_id}",
    }).execute()
    return {"message": "Attendance updated"}


# ── Analytics ─────────────────────────────────────────────────────────────────
@router.get("/analytics")
def get_analytics(user: dict = Depends(faculty_only)):
    db = get_supabase()

    # Get all sessions by this faculty
    sessions = db.table("sessions").select("id").eq("faculty_id", user["sub"]).execute().data or []
    session_ids = [s["id"] for s in sessions]

    if not session_ids:
        return {"trend_30_days": [], "defaulters": [], "today_summary": {}}

    # Get all records for these sessions
    records = db.table("attendance_records").select(
        "student_id, face_verified, mac_verified, students!inner(roll, name)"
    ).in_("session_id", session_ids).execute().data or []

    # Per-student aggregate
    student_map: dict = {}
    for rec in records:
        sid = rec["student_id"]
        stu = rec.get("students", {})
        if sid not in student_map:
            student_map[sid] = {
                "name":     stu.get("name", ""),
                "roll":     stu.get("roll", ""),
                "total":    0,
                "attended": 0,
            }
        student_map[sid]["total"] += 1
        if rec.get("face_verified") and rec.get("mac_verified"):
            student_map[sid]["attended"] += 1

    defaulters = []
    for sid, data in student_map.items():
        pct = round((data["attended"] / data["total"]) * 100) if data["total"] else 0
        if pct < 75:
            defaulters.append({"name": data["name"], "roll": data["roll"], "pct": pct})
    defaulters.sort(key=lambda x: x["pct"])

    # Today's summary (sessions started today)
    today = datetime.now(timezone.utc).date().isoformat()
    today_sessions = db.table("sessions").select("id").eq(
        "faculty_id", user["sub"]
    ).gte("started_at", today).execute().data or []
    today_ids = [s["id"] for s in today_sessions]

    today_records = []
    if today_ids:
        today_records = db.table("attendance_records").select(
            "face_verified, mac_verified"
        ).in_("session_id", today_ids).execute().data or []

    present = sum(1 for r in today_records if r.get("face_verified") and r.get("mac_verified"))
    absent  = sum(1 for r in today_records if not r.get("face_verified") and not r.get("mac_verified"))
    pending = len(today_records) - present - absent

    # 30-day trend: % of records that are present per day (last 30 sessions)
    trend_sessions = db.table("sessions").select("id, started_at").eq(
        "faculty_id", user["sub"]
    ).order("started_at", desc=True).limit(30).execute().data or []
    trend = []
    for tsess in reversed(trend_sessions):
        recs = db.table("attendance_records").select(
            "face_verified, mac_verified"
        ).eq("session_id", tsess["id"]).execute().data or []
        if recs:
            p = sum(1 for r in recs if r.get("face_verified") and r.get("mac_verified"))
            trend.append(round((p / len(recs)) * 100))

    return {
        "trend_30_days": trend,
        "defaulters": defaulters,
        "today_summary": {
            "present": present,
            "absent":  absent,
            "pending": pending,
            "total":   len(today_records),
        },
    }


# ── Reports / CSV Export ──────────────────────────────────────────────────────
@router.get("/reports/{report_type}")
def export_report(report_type: str, user: dict = Depends(faculty_only)):
    """
    Export report as CSV.
    report_type: daily | weekly | defaulter | subject | semester | audit
    """
    from utils.reports import list_to_csv

    db = get_supabase()
    sessions = db.table("sessions").select("id").eq("faculty_id", user["sub"]).execute().data or []
    session_ids = [s["id"] for s in sessions]

    records = []
    if session_ids:
        records = db.table("attendance_records").select(
            "*, students!inner(roll, name), sessions!inner(started_at, subjects!inner(code, name))"
        ).in_("session_id", session_ids).execute().data or []

    rows = []
    for rec in records:
        stu  = rec.get("students", {})
        sess = rec.get("sessions", {})
        subj = (sess.get("subjects") or {})
        rows.append({
            "roll":          stu.get("roll", ""),
            "name":          stu.get("name", ""),
            "subject":       subj.get("code", ""),
            "subject_name":  subj.get("name", ""),
            "date":          (sess.get("started_at", "")[:10]),
            "face_verified": rec.get("face_verified"),
            "mac_verified":  rec.get("mac_verified"),
            "confidence":    rec.get("confidence"),
            "present":       rec.get("face_verified") and rec.get("mac_verified"),
        })

    csv_str = list_to_csv(rows, ["roll", "name", "subject", "subject_name", "date",
                                  "face_verified", "mac_verified", "confidence", "present"])

    return StreamingResponse(
        io.StringIO(csv_str),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"},
    )
