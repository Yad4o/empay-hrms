from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.leave import LeaveRequest, LeaveBalance, LeaveStatus, LeaveType
from app.schemas.leave import LeaveApplyRequest, LeaveActionRequest, LeaveAllocateRequest, LeaveRequestOut, LeaveBalanceOut
from app.utils.auth import get_current_user, require_hr_or_admin, require_payroll_or_admin, require_hr_payroll_or_admin

router = APIRouter()


def _emp_for_user(db, user):
    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return emp


def _business_days(start: date, end: date) -> float:
    days = 0.0
    current = start
    while current <= end:
        if current.weekday() < 5:
            days += 1
        from datetime import timedelta
        current += timedelta(days=1)
    return days


@router.post("/apply", response_model=LeaveRequestOut)
def apply_leave(
    data: LeaveApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = _emp_for_user(db, current_user)
    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    total_days = _business_days(data.start_date, data.end_date)
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="No working days in the selected range")

    if data.leave_type != LeaveType.unpaid:
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == emp.id,
            LeaveBalance.leave_type == data.leave_type,
            LeaveBalance.year == data.start_date.year,
        ).first()
        if not balance or balance.remaining_days < total_days:
            raise HTTPException(status_code=400, detail=f"Insufficient {data.leave_type.value} leave balance")

    req = LeaveRequest(
        employee_id=emp.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        total_days=total_days,
        reason=data.reason,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _enrich(req, db)


@router.get("", response_model=List[LeaveRequestOut])
def list_leaves(
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LeaveRequest)
    if current_user.role == "employee":
        emp = _emp_for_user(db, current_user)
        q = q.filter(LeaveRequest.employee_id == emp.id)
    elif employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)

    if status:
        q = q.filter(LeaveRequest.status == status)

    return [_enrich(r, db) for r in q.order_by(LeaveRequest.created_at.desc()).all()]


@router.put("/{leave_id}/approve", response_model=LeaveRequestOut)
def approve_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_payroll_or_admin),
):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if req.status != LeaveStatus.pending:
        raise HTTPException(status_code=400, detail="Leave is not pending")

    req.status = LeaveStatus.approved
    req.approved_by = current_user.id
    req.approved_at = datetime.utcnow()

    if req.leave_type != LeaveType.unpaid:
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == req.employee_id,
            LeaveBalance.leave_type == req.leave_type,
            LeaveBalance.year == req.start_date.year,
        ).first()
        if balance:
            balance.used_days += req.total_days

    db.commit()
    db.refresh(req)
    return _enrich(req, db)


@router.put("/{leave_id}/reject", response_model=LeaveRequestOut)
def reject_leave(
    leave_id: int,
    data: LeaveActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_payroll_or_admin),
):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if req.status != LeaveStatus.pending:
        raise HTTPException(status_code=400, detail="Leave is not pending")

    if not data.rejection_reason or not data.rejection_reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    req.status = LeaveStatus.rejected
    req.approved_by = current_user.id
    req.approved_at = datetime.utcnow()
    req.rejection_reason = data.rejection_reason.strip()
    db.commit()
    db.refresh(req)
    return _enrich(req, db)


@router.get("/balance", response_model=List[LeaveBalanceOut])
def my_balance(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = _emp_for_user(db, current_user)
    y = year or date.today().year
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == emp.id,
        LeaveBalance.year == y,
    ).all()
    return balances


@router.get("/balance/{employee_id}", response_model=List[LeaveBalanceOut])
def employee_balance(
    employee_id: int,
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    y = year or date.today().year
    return db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == y,
    ).all()


@router.post("/allocate", response_model=LeaveBalanceOut)
def allocate_leave(
    data: LeaveAllocateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == data.employee_id,
        LeaveBalance.leave_type == data.leave_type,
        LeaveBalance.year == data.year,
    ).first()
    if balance:
        balance.allocated_days = data.allocated_days
    else:
        balance = LeaveBalance(
            employee_id=data.employee_id,
            leave_type=data.leave_type,
            year=data.year,
            allocated_days=data.allocated_days,
        )
        db.add(balance)
    db.commit()
    db.refresh(balance)
    return balance


def _enrich(req: LeaveRequest, db: Session) -> LeaveRequestOut:
    emp = req.employee
    data = LeaveRequestOut.model_validate(req)
    if emp:
        data.employee_name = emp.full_name
        data.emp_id = emp.emp_id
    return data
