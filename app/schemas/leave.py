from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_serializer
from app.models.leave import LeaveType, LeaveStatus


class LeaveApplyRequest(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str


class LeaveActionRequest(BaseModel):
    rejection_reason: Optional[str] = None


class LeaveAllocateRequest(BaseModel):
    employee_id: int
    leave_type: LeaveType
    year: int
    allocated_days: float


class LeaveRequestOut(BaseModel):
    id: int
    employee_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    total_days: float
    reason: str
    status: LeaveStatus
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime
    employee_name: Optional[str] = None
    emp_id: Optional[str] = None

    class Config:
        from_attributes = True


class LeaveBalanceOut(BaseModel):
    id: int
    employee_id: int
    leave_type: LeaveType
    year: int
    allocated_days: float
    used_days: float
    remaining_days: float = 0.0

    @field_serializer('remaining_days')
    def serialize_remaining_days(self, value: float, _info):
        return max(0, self.allocated_days - self.used_days)

    class Config:
        from_attributes = True
