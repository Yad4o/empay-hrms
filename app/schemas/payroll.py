from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.payroll import PayrollStatus, EntryStatus


class PayrollCreate(BaseModel):
    pay_period: str
    pay_period_start: str
    pay_period_end: str
    notes: Optional[str] = None


class PayrollOut(BaseModel):
    id: int
    pay_period: str
    pay_period_start: str
    pay_period_end: str
    status: PayrollStatus
    notes: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    total_employees: Optional[int] = 0
    total_net: Optional[float] = 0.0

    class Config:
        from_attributes = True


class PayrollEntryOut(BaseModel):
    id: int
    payroll_id: int
    employee_id: int
    employee_name: Optional[str] = None
    emp_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    working_days: int
    present_days: float
    absent_days: float
    leave_days: float
    lop_days: float
    basic_salary: float
    hra: float
    other_allowances: float
    gross_salary: float
    lop_deduction: float
    pf_employee: float
    pf_employer: float
    professional_tax: float
    other_deductions: float
    total_deductions: float
    net_salary: float
    status: EntryStatus

    class Config:
        from_attributes = True


class PayslipOut(PayrollEntryOut):
    pay_period: Optional[str] = None
    pay_period_start: Optional[str] = None
    pay_period_end: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    join_date: Optional[str] = None
