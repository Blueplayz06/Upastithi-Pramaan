"""
Auth Router
POST /auth/login     — login for student, faculty, or admin
POST /auth/logout    — client-side token discard (noop on server)
"""
from fastapi import APIRouter, HTTPException

from database import get_supabase
from models.auth import LoginRequest, TokenResponse
from utils.auth import verify_password, create_token

router = APIRouter()


def _data(res):
    """
    Safely extract .data from a supabase response.
    In supabase-py 2.7.x, .maybe_single().execute() returns None
    (not an object with .data=None) when no row matches.
    """
    if res is None:
        return None
    return res.data


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    db = get_supabase()

    role = body.role.lower()
    if role not in ("student", "faculty", "admin"):
        raise HTTPException(status_code=400, detail="role must be student, faculty or admin")

    # ── Fetch user record by role-specific ID ─────────────────────────────────
    if role == "student":
        res = (
            db.table("students")
            .select("*, users!inner(password_hash, role)")
            .eq("roll", body.id)
            .maybe_single()
            .execute()
        )
        student = _data(res)
        if not student:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        pw_hash = student["users"]["password_hash"]
        if not verify_password(body.password, pw_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        profile = {
            "id":          student["id"],
            "roll":        student["roll"],
            "name":        student["name"],
            "division":    student["division"],
            "semester":    student.get("semester", "5"),
            "email":       student.get("email", ""),
            "department":  student.get("department", "Computer Engineering"),
            "institution": student.get("institution", "Fr. CRCE"),
        }
        token_data = {"sub": student["id"], "role": "student", "roll": student["roll"]}

    elif role == "faculty":
        res = (
            db.table("faculty")
            .select("*, users!inner(password_hash, role)")
            .eq("emp_id", body.id)
            .maybe_single()
            .execute()
        )
        fac = _data(res)
        if not fac:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        pw_hash = fac["users"]["password_hash"]
        if not verify_password(body.password, pw_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        profile = {
            "id":         fac["id"],
            "emp_id":     fac["emp_id"],
            "name":       fac["name"],
            "department": fac.get("department", "Computer Engineering"),
            "subjects":   fac.get("subjects", []),
        }
        token_data = {"sub": fac["id"], "role": "faculty", "emp_id": fac["emp_id"]}

    else:  # admin
        res = (
            db.table("users")
            .select("*")
            .eq("admin_id", body.id)
            .eq("role", "admin")
            .maybe_single()
            .execute()
        )
        admin_user = _data(res)
        if not admin_user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not verify_password(body.password, admin_user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        profile = {
            "id":       admin_user["id"],
            "admin_id": admin_user.get("admin_id", "ADM-001"),
            "name":     admin_user.get("name", "System Admin"),
        }
        token_data = {"sub": admin_user["id"], "role": "admin"}

    # ── Log the login event ───────────────────────────────────────────────────
    try:
        db.table("audit_logs").insert({
            "actor_id": token_data["sub"],
            "action":   "LOGIN",
            "details":  f"{role} login",
        }).execute()
    except Exception:
        pass  # non-fatal

    token = create_token(token_data)
    return TokenResponse(access_token=token, role=role, profile=profile)


@router.post("/logout", status_code=204)
def logout():
    """
    Tokens are stateless (JWTs); the client simply discards the token.
    This endpoint exists so the frontend can call a logout URL consistently.
    """
    return
