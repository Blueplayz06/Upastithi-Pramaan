"""Student-related Pydantic schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import date


class StudentProfile(BaseModel):
    id: str
    roll: str
    name: str
    division: str
    semester: str
    email: Optional[str] = None
    institution: Optional[str] = None
    department: Optional[str] = None


class DeviceInfo(BaseModel):
    mac: str
    device_name: Optional[str] = None
    registered_at: Optional[str] = None
    status: str = "approved"


class DeviceChangeRequest(BaseModel):
    new_mac: str
    device_name: Optional[str] = None
    reason: Optional[str] = None


class MarkAttendanceRequest(BaseModel):
    session_id: str
    mac_address: str
    image_base64: Optional[str] = None
    twofa_code: Optional[str] = None


class AttendanceSummary(BaseModel):
    subject_code: str
    subject_name: str
    faculty: str
    total: int
    attended: int
    percentage: float
    color: Optional[str] = None


class CalendarDay(BaseModel):
    day: int
    month: int
    year: int
    status: Literal["present", "absent", "no-class"]
    subject_code: Optional[str] = None


class DisputeCreate(BaseModel):
    subject_id: str
    date: date
    message: str


class DisputeOut(BaseModel):
    id: str
    subject_code: str
    subject_name: str
    date: str
    message: str
    status: str
    created_at: str
