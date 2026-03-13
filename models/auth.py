"""Auth-related Pydantic schemas."""
from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    role: str        # "student" | "faculty" | "admin"
    id: str          # roll number / emp_id / admin_id
    password: str
    division: Optional[str] = None  # only for students


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    profile: dict
