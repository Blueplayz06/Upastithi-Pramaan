"""
Upastithi-Pramaan — FastAPI Backend
Entry point: uvicorn main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, students, faculty, admin, disputes, notifications

app = FastAPI(
    title="Upastithi-Pramaan API",
    description="Backend API for the Upastithi-Pramaan smart attendance system",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Allow all origins (restrict to specific domains in production)
    allow_credentials=False,  # Must be False when allow_origins=["*"]
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
