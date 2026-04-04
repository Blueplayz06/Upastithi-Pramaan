"""Admin-related Pydantic schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List


class EnrollStudent(BaseModel):
    name: str
    roll: str
    division: str
    email: Optional[str] = None
    mac: Optional[str] = None
    semester: str = "5"
    department: str = "Computer Engineering"
    password: str = "frcrce@123"   # admin can set a custom password; defaults to college default
    face_images: Optional[List[str]] = None # List of base64 encoded images


class UpdateStudent(BaseModel):
    name: Optional[str] = None
    division: Optional[str] = None
    email: Optional[str] = None
    mac: Optional[str] = None
    semester: Optional[str] = None


class AddFaculty(BaseModel):
    name: str
    emp_id: str
    department: str = "Computer Engineering"
    subjects: Optional[str] = None   # comma-separated e.g. "CS-101, CS-203"
    email: Optional[str] = None
    password: str = "frcrce@123"    # default password, forces reset on first login


class UpdateFaculty(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    subjects: Optional[str] = None
    email: Optional[str] = None


class DeviceAction(BaseModel):
    mac: str


class AdminDisputeAction(BaseModel):
    dispute_id: str
    action: str  # "resolve" | "reject"


class OverviewStats(BaseModel):
    total_students: int
    total_faculty: int
    sessions_today: int
    pending_actions: int
