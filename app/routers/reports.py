from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance, AttendanceStatus
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.payroll import Payroll, PayrollEntry, PayrollStatus
from app.utils.auth import get_current_user, require_hr_payroll_or_admin
import calendar

router = APIRouter()


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    month_start = today.replace(day=1)
    _, last_day = calendar.monthrange(today.year, today.month)
    month_end = today.replace(day=last_day)

    total_employees = db.query(Employee).filter(Employee.is_active == True).count()
    total_present_today = db.query(Attendance).filter(
        Attendance.date == today,
        Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]),
    ).count()
    pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == LeaveStatus.pending).count()
    last_payrun = db.query(Payroll).order_by(Payroll.created_at.desc()).first()

    attendance_by_day = []
    if current_user.role != "employee":
        rows = db.query(
            Attendance.date,
            func.count(Attendance.id).label("total"),
            func.sum(func.cast(Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]), int)).label("present"),
        ).filter(
            Attendance.date.between(month_start, today)
        ).group_by(Attendance.date).order_by(Attendance.date).all()
        attendance_by_day = [{"date": str(r.date), "total": r.total, "present": r.present or 0} for r in rows]

    dept_counts = []
    if current_user.role in ("admin", "hr_officer"):
        rows = db.query(Employee.department, func.count(Employee.id)).filter(
            Employee.is_active == True
        ).group_by(Employee.department).all()
        dept_counts = [{"department": r[0], "count": r[1]} for r in rows]

    leave_status_counts = db.query(
        LeaveRequest.status, func.count(LeaveRequest.id)
    ).group_by(LeaveRequest.status).all()
    leave_stats = {r[0]: r[1] for r in leave_status_counts}

    recent_payrolls = []
    if current_user.role in ("admin", "payroll_officer"):
        payruns = db.query(Payroll).order_by(Payroll.created_at.desc()).limit(6).all()
        for p in payruns:
            total_net = sum(e.net_salary for e in p.entries)
            recent_payrolls.append({"period": p.pay_period, "total": round(total_net, 2), "status": p.status})

    return {
        "total_employees": total_employees,
        "present_today": total_present_today,
        "absent_today": total_employees - total_present_today,
        "pending_leaves": pending_leaves,
        "last_payrun": last_payrun.pay_period if last_payrun else None,
        "last_payrun_status": last_payrun.status if last_payrun else None,
        "attendance_trend": attendance_by_day,
        "department_distribution": dept_counts,
        "leave_stats": leave_stats,
        "recent_payrolls": recent_payrolls,
    }


@router.get("/attendance-summary")
def attendance_summary(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_payroll_or_admin),
):
    y = year or date.today().year
    m = month or date.today().month
    _, last_day = calendar.monthrange(y, m)
    start = date(y, m, 1)
    end = date(y, m, last_day)

    employees = db.query(Employee).filter(Employee.is_active == True).all()
    result = []
    for emp in employees:
        records = db.query(Attendance).filter(
            Attendance.employee_id == emp.id,
            Attendance.date.between(start, end),
        ).all()
        present = sum(1 for r in records if r.status in (AttendanceStatus.present, AttendanceStatus.late))
        half = sum(1 for r in records if r.status == AttendanceStatus.half_day)
        on_leave = sum(1 for r in records if r.status == AttendanceStatus.on_leave)
        result.append({
            "emp_id": emp.emp_id,
            "name": emp.full_name,
            "department": emp.department,
            "present": present,
            "half_day": half,
            "on_leave": on_leave,
            "absent": last_day - present - half - on_leave,
        })
    return result


@router.get("/leave-report")
def leave_report(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_payroll_or_admin),
):
    y = year or date.today().year
    requests = db.query(LeaveRequest).filter(
        func.strftime('%Y', LeaveRequest.start_date) == str(y)
    ).all()

    return [
        {
            "id": r.id,
            "emp_id": r.employee.emp_id if r.employee else None,
            "name": r.employee.full_name if r.employee else None,
            "department": r.employee.department if r.employee else None,
            "leave_type": r.leave_type,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "total_days": r.total_days,
            "status": r.status,
            "reason": r.reason,
        }
        for r in requests
    ]
