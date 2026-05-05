from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.models.attendance import AttendanceStatus


class AttendanceMarkIn(BaseModel):
    date: Optional[date] = None
    status: AttendanceStatus = AttendanceStatus.present
    remarks: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatus] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    remarks: Optional[str] = None


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    date: date
    check_in: Optional[datetime]
    check_out: Optional[datetime]
    status: AttendanceStatus
    total_hours: Optional[float]
    remarks: Optional[str]

    class Config:
        from_attributes = True


class AttendanceWithEmployee(AttendanceOut):
    employee_name: Optional[str] = None
    emp_id: Optional[str] = None
    department: Optional[str] = None
