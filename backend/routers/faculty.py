"""
Faculty Router
All endpoints require JWT with role = "faculty".

GET  /faculty/me                              — profile
GET  /faculty/subjects                        — subjects assigned to this faculty
POST /faculty/sessions/start                  — start an attendance session (generates 2FA code)
POST /faculty/sessions/{id}/end               — end a session (clears 2FA code)
GET  /faculty/sessions/{id}/students          — live student list for a session
PATCH /faculty/sessions/{id}/override         — manual override for a student
GET  /faculty/analytics                       — 30-day trend, defaulters, today's summary
GET  /faculty/reports/{type}                  — export CSV report (supports from_date / to_date)
GET  /faculty/sessions/active                 — get currently active session (with 2FA code + expiry)
POST /faculty/sessions/{id}/refresh-code      — manually refresh the 2FA code early
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io
import random
import string
from datetime import datetime, timezone, timedelta

from database import get_supabase, safe_data
from dependencies import require_role
from models.faculty import SessionStart, AttendanceOverride

router = APIRouter()
faculty_only = require_role("faculty")

# ── 2FA helpers ───────────────────────────────────────────────────────────────
_CODE_TTL_SECONDS = 300  # 5 minutes

def _generate_code() -> str:
    """Return a random 6-digit numeric string."""
    return "".join(random.choices(string.digits, k=6))

def _write_code_to_db(db, session_id: str, code: str):
    """Persist code and its expiry into the sessions row."""
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=_CODE_TTL_SECONDS)).isoformat()
    db.table("sessions").update({
        "twofa_code": code,
        "twofa_code_expires_at": expires_at,
    }).eq("id", session_id).execute()
    return expires_at

def rotate_active_session_codes():
    """
    Called by APScheduler every 5 minutes.
    Regenerates codes for all currently-active sessions.
    """
    try:
        db = get_supabase()
        active = db.table("sessions").select("id").eq("active", True).execute().data or []
        for row in active:
            code = _generate_code()
            _write_code_to_db(db, row["id"], code)
        if active:
            print(f"[2FA] Rotated codes for {len(active)} active session(s).")
    except Exception as exc:
        print(f"[2FA] Code rotation error: {exc}")


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
    data = safe_data(res)
    if not data:
        return None
    # Check if code has expired; if so, rotate it now
    expires_at_str = data.get("twofa_code_expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) >= expires_at:
            code = _generate_code()
            expires_at_str = _write_code_to_db(db, data["id"], code)
            data["twofa_code"] = code
            data["twofa_code_expires_at"] = expires_at_str
    return data


@router.post("/sessions/start", status_code=201)
def start_session(body: SessionStart, user: dict = Depends(faculty_only)):
    db = get_supabase()
    # Only one active session at a time per faculty
    existing = db.table("sessions").select("id").eq(
        "faculty_id", user["sub"]
    ).eq("active", True).execute()
    if safe_data(existing):
        raise HTTPException(400, "You already have an active session. End it before starting a new one.")

    # Generate initial 2FA code
    code = _generate_code()
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=_CODE_TTL_SECONDS)).isoformat()

    res = db.table("sessions").insert({
        "subject_id":            body.subject_id,
        "faculty_id":            user["sub"],
        "started_at":            datetime.now(timezone.utc).isoformat(),
        "active":                True,
        "twofa_code":            code,
        "twofa_code_expires_at": expires_at,
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
        "active":                False,
        "ended_at":              datetime.now(timezone.utc).isoformat(),
        "twofa_code":            None,
        "twofa_code_expires_at": None,
    }).eq("id", session_id).execute()

    db.table("audit_logs").insert({
        "actor_id": user["sub"],
        "action":   "SESSION_END",
        "details":  f"session_id={session_id}",
    }).execute()
    return {"message": "Session ended"}


@router.post("/sessions/{session_id}/refresh-code")
def refresh_code(session_id: str, user: dict = Depends(faculty_only)):
    """Manually force-rotate the 2FA code for an active session."""
    db = get_supabase()
    sess = db.table("sessions").select("faculty_id, active").eq("id", session_id).maybe_single().execute()
    sess_data = safe_data(sess)
    if not sess_data:
        raise HTTPException(404, "Session not found")
    if sess_data["faculty_id"] != user["sub"]:
        raise HTTPException(403, "Not your session")
    if not sess_data.get("active"):
        raise HTTPException(400, "Session is not active")

    code = _generate_code()
    expires_at = _write_code_to_db(db, session_id, code)
    return {"twofa_code": code, "twofa_code_expires_at": expires_at}


@router.get("/sessions/{session_id}/students")
def get_session_students(session_id: str, user: dict = Depends(faculty_only)):
    db = get_supabase()
    # 1. Verify session belongs to this faculty and get subject
    sess = db.table("sessions").select(
        "faculty_id, subject_id, subjects(semester)"
    ).eq("id", session_id).maybe_single().execute()
    sess_data = safe_data(sess)
    if not sess_data or sess_data.get("faculty_id") != user["sub"]:
        raise HTTPException(403, "Access denied")

    semester = (sess_data.get("subjects") or {}).get("semester", "5")

    # 2. Fetch all students for this semester
    students_res = db.table("students").select("id, roll, name").eq("semester", semester).execute()
    all_students = safe_data(students_res) or []

    # 3. Fetch attendance records for this session
    att_res = db.table("attendance_records").select(
        "student_id, face_verified, mac_verified, confidence, marked_at"
    ).eq("session_id", session_id).execute()
    
    att_map = {r["student_id"]: r for r in (safe_data(att_res) or [])}

    # 4. Build full roster
    rows = []
    for stu in all_students:
        rec = att_map.get(stu["id"], {})
        rows.append({
            "id":            stu["id"],
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
    res = db.table("attendance_records").select("id").eq(
        "session_id", session_id
    ).eq("student_id", body.student_id).limit(1).execute()

    now = datetime.now(timezone.utc).isoformat()
    existing_data = res.data[0] if res.data else None
    
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
def export_report(
    report_type: str,
    from_date: str = Query(None, description="Start date (YYYY-MM-DD), inclusive"),
    to_date:   str = Query(None, description="End date   (YYYY-MM-DD), inclusive"),
    user: dict = Depends(faculty_only),
):
    """
    Export report as CSV.
    report_type: daily | weekly | defaulter | subject | semester | audit | custom
    Optional query params: from_date, to_date (YYYY-MM-DD) to filter by session date.
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
        date_str = sess.get("started_at", "")[:10]

        # ── Date-range filter ──────────────────────────────────────────────────
        if from_date and date_str < from_date:
            continue
        if to_date and date_str > to_date:
            continue

        rows.append({
            "roll":          stu.get("roll", ""),
            "name":          stu.get("name", ""),
            "subject":       subj.get("code", ""),
            "subject_name":  subj.get("name", ""),
            "date":          date_str,
            "face_verified": rec.get("face_verified"),
            "mac_verified":  rec.get("mac_verified"),
            "confidence":    rec.get("confidence"),
            "present":       rec.get("face_verified") and rec.get("mac_verified"),
        })

    csv_str = list_to_csv(rows, ["roll", "name", "subject", "subject_name", "date",
                                  "face_verified", "mac_verified", "confidence", "present"])

    filename = f"{report_type}_report"
    if from_date or to_date:
        filename += f"_{from_date or 'start'}_to_{to_date or 'today'}"
    filename += ".csv"

    return StreamingResponse(
        io.StringIO(csv_str),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
