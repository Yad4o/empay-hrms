from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.models.leave import LeaveBalance, LeaveType
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.utils.auth import get_current_user, require_hr_or_admin, require_hr_payroll_or_admin
from app.utils.auth import hash_password
from datetime import datetime

router = APIRouter()


def next_emp_id(db: Session) -> str:
    last = db.query(Employee).order_by(Employee.id.desc()).first()
    num = (last.id + 1) if last else 1
    return f"EMP{num:03d}"


def init_leave_balances(db: Session, employee_id: int, year: int):
    defaults = {LeaveType.annual: 12, LeaveType.sick: 6, LeaveType.casual: 6}
    for lt, days in defaults.items():
        exists = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.leave_type == lt,
            LeaveBalance.year == year,
        ).first()
        if not exists:
            db.add(LeaveBalance(employee_id=employee_id, leave_type=lt, year=year, allocated_days=days))
    db.commit()


@router.get("", response_model=List[EmployeeOut])
def list_employees(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Employee)
    if search:
        q = q.filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.emp_id.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )
    if department:
        q = q.filter(Employee.department == department)
    if is_active is not None:
        q = q.filter(Employee.is_active == is_active)
    return q.all()


@router.post("", response_model=EmployeeOut)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.employee,
    )
    db.add(user)
    db.flush()

    emp = Employee(
        user_id=user.id,
        emp_id=next_emp_id(db),
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        department=data.department,
        designation=data.designation,
        join_date=data.join_date,
        basic_salary=data.basic_salary,
        hra_percent=data.hra_percent,
        other_allowances=data.other_allowances,
        address=data.address,
        gender=data.gender,
        date_of_birth=data.date_of_birth,
        bank_account=data.bank_account,
        ifsc_code=data.ifsc_code,
        pan_number=data.pan_number,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    init_leave_balances(db, emp.id, datetime.now().year)
    return emp


@router.get("/me", response_model=EmployeeOut)
def my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return emp


@router.get("/departments")
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(Employee.department).distinct().all()
    return [r[0] for r in rows if r[0]]


@router.get("/stats")
def employee_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_payroll_or_admin),
):
    by_dept = (
        db.query(Employee.department, func.count(Employee.id))
        .filter(Employee.is_active == True)
        .group_by(Employee.department)
        .all()
    )
    total_active = db.query(Employee).filter(Employee.is_active == True).count()
    total_inactive = db.query(Employee).filter(Employee.is_active == False).count()
    return {
        "total_active": total_active,
        "total_inactive": total_inactive,
        "by_department": [{"department": r[0], "count": r[1]} for r in by_dept],
    }


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    # Employees can only view their own detailed record
    if current_user.role == "employee":
        own = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not own or own.id != emp_id:
            raise HTTPException(status_code=403, detail="Access denied")
    return emp


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(
    emp_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Employees can only update their own non-salary fields
    if current_user.role == "employee":
        own = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not own or own.id != emp_id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Restrict updatable fields
        allowed = {"phone", "address"}
        update_data = data.model_dump(exclude_none=True)
        update_data = {k: v for k, v in update_data.items() if k in allowed}
    elif current_user.role not in ("admin", "hr_officer"):
        raise HTTPException(status_code=403, detail="Access denied")
    else:
        update_data = data.model_dump(exclude_none=True)

    for k, v in update_data.items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{emp_id}")
def deactivate_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.is_active = False
    if emp.user:
        emp.user.is_active = False
    db.commit()
    return {"message": "Employee deactivated"}
