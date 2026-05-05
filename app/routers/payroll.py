from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.payroll import Payroll, PayrollEntry, PayrollStatus, EntryStatus
from app.schemas.payroll import PayrollCreate, PayrollOut, PayrollEntryOut, PayslipOut
from app.utils.auth import get_current_user, require_payroll_or_admin
from app.utils.payroll_calc import calculate_payroll_entry
import calendar

router = APIRouter()


@router.get("", response_model=List[PayrollOut])
def list_payruns(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_payroll_or_admin),
):
    payruns = db.query(Payroll).order_by(Payroll.created_at.desc()).all()
    result = []
    for p in payruns:
        total_net = sum(e.net_salary for e in p.entries)
        out = PayrollOut.model_validate(p)
        out.total_employees = len(p.entries)
        out.total_net = round(total_net, 2)
        result.append(out)
    return result


@router.post("", response_model=PayrollOut)
def create_payrun(
    data: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_payroll_or_admin),
):
    existing = db.query(Payroll).filter(Payroll.pay_period == data.pay_period).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payrun for this period already exists")

    payrun = Payroll(
        pay_period=data.pay_period,
        pay_period_start=data.pay_period_start,
        pay_period_end=data.pay_period_end,
        notes=data.notes,
        created_by=current_user.id,
        status=PayrollStatus.draft,
    )
    db.add(payrun)
    db.commit()
    db.refresh(payrun)

    try:
        parts = data.pay_period.split()
        month_name, year_str = parts[0], parts[1]
        month = list(calendar.month_name).index(month_name)
        year = int(year_str)
    except Exception:
        db.delete(payrun)
        db.commit()
        raise HTTPException(status_code=400, detail="pay_period must be 'Month YYYY' e.g. 'May 2025'")

    _, last_day = calendar.monthrange(year, month)
    period_start = date(year, month, 1)
    period_end = date(year, month, last_day)

    employees = db.query(Employee).filter(Employee.is_active == True).all()
    for emp in employees:
        attendance = db.query(Attendance).filter(
            Attendance.employee_id == emp.id,
            Attendance.date.between(period_start, period_end),
        ).all()

        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.start_date <= period_end,
            LeaveRequest.end_date >= period_start,
        ).all()

        leave_days = sum(l.total_days for l in approved_leaves)
        calc = calculate_payroll_entry(emp, year, month, attendance, leave_days)

        entry = PayrollEntry(
            payroll_id=payrun.id,
            employee_id=emp.id,
            **calc,
        )
        db.add(entry)

    db.commit()
    db.refresh(payrun)
    out = PayrollOut.model_validate(payrun)
    out.total_employees = len(payrun.entries)
    out.total_net = round(sum(e.net_salary for e in payrun.entries), 2)
    return out


@router.get("/{payrun_id}", response_model=PayrollOut)
def get_payrun(
    payrun_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_payroll_or_admin),
):
    payrun = db.query(Payroll).filter(Payroll.id == payrun_id).first()
    if not payrun:
        raise HTTPException(status_code=404, detail="Payrun not found")
    out = PayrollOut.model_validate(payrun)
    out.total_employees = len(payrun.entries)
    out.total_net = round(sum(e.net_salary for e in payrun.entries), 2)
    return out


@router.post("/{payrun_id}/process")
def process_payrun(
    payrun_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_payroll_or_admin),
):
    payrun = db.query(Payroll).filter(Payroll.id == payrun_id).first()
    if not payrun:
        raise HTTPException(status_code=404, detail="Payrun not found")
    payrun.status = PayrollStatus.processed
    payrun.processed_at = datetime.utcnow()
    for entry in payrun.entries:
        entry.status = EntryStatus.approved
    db.commit()
    return {"message": "Payrun processed successfully"}


@router.post("/{payrun_id}/mark-paid")
def mark_paid(
    payrun_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_payroll_or_admin),
):
    payrun = db.query(Payroll).filter(Payroll.id == payrun_id).first()
    if not payrun:
        raise HTTPException(status_code=404, detail="Payrun not found")
    payrun.status = PayrollStatus.paid
    for entry in payrun.entries:
        entry.status = EntryStatus.paid
    db.commit()
    return {"message": "Payrun marked as paid"}


@router.get("/{payrun_id}/entries", response_model=List[PayrollEntryOut])
def get_entries(
    payrun_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_payroll_or_admin),
):
    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_id == payrun_id).all()
    return [_enrich_entry(e) for e in entries]


@router.get("/entry/{entry_id}/payslip", response_model=PayslipOut)
def get_payslip(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(PayrollEntry).filter(PayrollEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Payslip not found")

    if current_user.role == "employee":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != entry.employee_id:
            raise HTTPException(status_code=403, detail="Access denied")

    payrun = entry.payroll
    emp = entry.employee
    out = PayslipOut.model_validate(entry)
    out.employee_name = emp.full_name if emp else None
    out.emp_id = emp.emp_id if emp else None
    out.department = emp.department if emp else None
    out.designation = emp.designation if emp else None
    out.pay_period = payrun.pay_period if payrun else None
    out.pay_period_start = payrun.pay_period_start if payrun else None
    out.pay_period_end = payrun.pay_period_end if payrun else None
    out.email = emp.email if emp else None
    out.phone = emp.phone if emp else None
    out.bank_account = emp.bank_account if emp else None
    out.ifsc_code = emp.ifsc_code if emp else None
    out.pan_number = emp.pan_number if emp else None
    out.join_date = str(emp.join_date) if emp and emp.join_date else None
    return out


@router.get("/employee/my-payslips", response_model=List[PayrollEntryOut])
def my_payslips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    entries = db.query(PayrollEntry).filter(PayrollEntry.employee_id == emp.id).all()
    return [_enrich_entry(e) for e in entries]


def _enrich_entry(entry: PayrollEntry) -> PayrollEntryOut:
    out = PayrollEntryOut.model_validate(entry)
    emp = entry.employee
    if emp:
        out.employee_name = emp.full_name
        out.emp_id = emp.emp_id
        out.department = emp.department
        out.designation = emp.designation
    return out
