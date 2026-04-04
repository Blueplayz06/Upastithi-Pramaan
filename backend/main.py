"""
Upastithi-Pramaan — FastAPI Backend
Entry point: uvicorn main:app --reload
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from routers import auth, students, faculty, admin, disputes, notifications
from routers.faculty import rotate_active_session_codes, _CODE_TTL_SECONDS

# ── APScheduler: rotate 2FA codes every 5 minutes ─────────────────────────────
_scheduler = BackgroundScheduler(daemon=True)
_scheduler.add_job(
    rotate_active_session_codes,
    "interval",
    seconds=_CODE_TTL_SECONDS,
    id="rotate_2fa_codes",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _scheduler.start()
    print(f"[2FA] Scheduler started — codes rotate every {_CODE_TTL_SECONDS // 60} min.")
    yield
    _scheduler.shutdown(wait=False)
    print("[2FA] Scheduler stopped.")


app = FastAPI(
    title="Upastithi-Pramaan API",
    description="Backend API for the Upastithi-Pramaan smart attendance system",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
app.include_router(students.router,      prefix="/students",      tags=["Students"])
app.include_router(faculty.router,       prefix="/faculty",       tags=["Faculty"])
app.include_router(admin.router,         prefix="/admin",         tags=["Admin"])
app.include_router(disputes.router,      prefix="/disputes",      tags=["Disputes"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "upastithi-pramaan-api"}
