from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance, AttendanceStatus
from app.schemas.attendance import AttendanceMarkIn, AttendanceUpdate, AttendanceOut, AttendanceWithEmployee
from app.utils.auth import get_current_user, require_hr_payroll_or_admin

router = APIRouter()


def _emp_for_user(db: Session, user: User) -> Employee:
    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return emp


@router.post("/mark", response_model=AttendanceOut)
def mark_attendance(
    data: AttendanceMarkIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = _emp_for_user(db, current_user)
    target_date = data.date or date.today()

    existing = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == target_date,
    ).first()
    if existing:
        existing.check_out = datetime.utcnow()
        if existing.check_in:
            delta = existing.check_out - existing.check_in
            existing.total_hours = round(delta.total_seconds() / 3600, 2)
        db.commit()
        db.refresh(existing)
        return existing

    record = Attendance(
        employee_id=emp.id,
        date=target_date,
        check_in=datetime.utcnow(),
        status=data.status,
        remarks=data.remarks,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/today")
def today_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = _emp_for_user(db, current_user)
    record = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == date.today(),
    ).first()
    return {"marked": record is not None, "status": record.status if record else None, "check_in": record.check_in if record else None}


@router.get("/my", response_model=List[AttendanceOut])
def my_attendance(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = _emp_for_user(db, current_user)
    q = db.query(Attendance).filter(Attendance.employee_id == emp.id)
    if month:
        q = q.filter(Attendance.date.between(
            date(year or date.today().year, month, 1),
            date(year or date.today().year, month, 28),
        ))
    return q.order_by(Attendance.date.desc()).all()


@router.get("", response_model=List[AttendanceWithEmployee])
def all_attendance(
    employee_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    attendance_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Access denied")

    q = db.query(Attendance)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if attendance_date:
        q = q.filter(Attendance.date == attendance_date)
    elif month:
        y = year or date.today().year
        import calendar
        _, last_day = calendar.monthrange(y, month)
        q = q.filter(Attendance.date.between(date(y, month, 1), date(y, month, last_day)))

    records = q.order_by(Attendance.date.desc()).all()
    result = []
    for r in records:
        emp = r.employee
        result.append(AttendanceWithEmployee(
            **AttendanceOut.model_validate(r).model_dump(),
            employee_name=emp.full_name if emp else None,
            emp_id=emp.emp_id if emp else None,
            department=emp.department if emp else None,
        ))
    return result


@router.put("/{record_id}", response_model=AttendanceOut)
def update_attendance(
    record_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_payroll_or_admin),
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(record, k, v)
    if record.check_in and record.check_out:
        delta = record.check_out - record.check_in
        record.total_hours = round(delta.total_seconds() / 3600, 2)
    db.commit()
    db.refresh(record)
    return record
