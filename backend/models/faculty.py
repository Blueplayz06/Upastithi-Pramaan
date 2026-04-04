"""Faculty-related Pydantic schemas."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FacultyProfile(BaseModel):
    id: str
    emp_id: str
    name: str
    department: str
    subjects: List[str] = []


class SessionStart(BaseModel):
    subject_id: str


class SessionOut(BaseModel):
    id: str
    subject_id: str
    subject_code: str
    subject_name: str
    started_at: str
    ended_at: Optional[str] = None
    active: bool


class AttendanceOverride(BaseModel):
    student_id: str
    present: bool   # True = mark present, False = mark absent


class StudentAttendanceRow(BaseModel):
    roll: str
    name: str
    face_verified: bool
    mac_verified: bool
    confidence: Optional[float] = None
    marked_at: Optional[str] = None


class AnalyticsData(BaseModel):
    trend_30_days: List[int]
    defaulters: List[dict]
    today_summary: dict
