from datetime import date, datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.models.attendance import Attendance, AttendanceStatus
from app.models.leave import LeaveRequest, LeaveBalance, LeaveType, LeaveStatus
from app.models.payroll import Payroll, PayrollEntry, PayrollStatus, EntryStatus
from app.utils.auth import hash_password
from app.utils.payroll_calc import calculate_payroll_entry
import calendar


EMPLOYEES_DATA = [
    {"first_name": "Arjun", "last_name": "Mehta", "email": "arjun@empay.com", "department": "Engineering", "designation": "Senior Software Engineer", "basic_salary": 75000, "gender": "Male"},
    {"first_name": "Priya", "last_name": "Sharma", "email": "priya@empay.com", "department": "Design", "designation": "UI/UX Designer", "basic_salary": 58000, "gender": "Female"},
    {"first_name": "Rahul", "last_name": "Verma", "email": "rahul@empay.com", "department": "Analytics", "designation": "Data Analyst", "basic_salary": 62000, "gender": "Male"},
    {"first_name": "Sneha", "last_name": "Joshi", "email": "sneha@empay.com", "department": "Marketing", "designation": "Marketing Manager", "basic_salary": 65000, "gender": "Female"},
    {"first_name": "Kiran", "last_name": "Patel", "email": "kiran@empay.com", "department": "Engineering", "designation": "DevOps Engineer", "basic_salary": 70000, "gender": "Male"},
]


def seed_database(db: Session):
    if db.query(User).count() > 0:
        return

    print("[EmPay] Seeding demo data...")

    # System users
    system_users = [
        (UserRole.admin, "admin@empay.com", "Admin"),
        (UserRole.hr_officer, "hr@empay.com", "HR Officer"),
        (UserRole.payroll_officer, "payroll@empay.com", "Payroll Officer"),
    ]
    for role, email, _ in system_users:
        user = User(email=email, password_hash=hash_password("Admin@123"), role=role)
        db.add(user)
    db.flush()

    # Employees
    emp_objects = []
    for i, emp_data in enumerate(EMPLOYEES_DATA):
        user = User(
            email=emp_data["email"],
            password_hash=hash_password("Admin@123"),
            role=UserRole.employee,
        )
        db.add(user)
        db.flush()

        join = date(2023, random.randint(1, 12), random.randint(1, 28))
        emp = Employee(
            user_id=user.id,
            emp_id=f"EMP{i+1:03d}",
            first_name=emp_data["first_name"],
            last_name=emp_data["last_name"],
            email=emp_data["email"],
            phone=f"+91 98{random.randint(10000000, 99999999)}",
            department=emp_data["department"],
            designation=emp_data["designation"],
            join_date=join,
            basic_salary=emp_data["basic_salary"],
            hra_percent=40.0,
            other_allowances=5000,
            gender=emp_data["gender"],
            date_of_birth=date(1990 + i * 2, random.randint(1, 12), random.randint(1, 28)),
            bank_account=f"50{random.randint(100000000000, 999999999999)}",
            ifsc_code="SBIN0001234",
            pan_number=f"ABCDE{random.randint(1000, 9999)}F",
            is_active=True,
        )
        db.add(emp)
        db.flush()
        emp_objects.append(emp)

        # Leave balances for current year
        for lt, days in [(LeaveType.annual, 12), (LeaveType.sick, 6), (LeaveType.casual, 6)]:
            db.add(LeaveBalance(employee_id=emp.id, leave_type=lt, year=date.today().year, allocated_days=days))

    db.commit()

    # Attendance for last 2 months
    today = date.today()
    for emp in emp_objects:
        for months_back in range(2, -1, -1):
            m = today.month - months_back
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            _, last_day = calendar.monthrange(y, m)
            end_day = today.day if (m == today.month and y == today.year) else last_day
            for d in range(1, end_day + 1):
                dt = date(y, m, d)
                if dt.weekday() >= 5:
                    continue
                rand = random.random()
                if rand < 0.85:
                    status = AttendanceStatus.present
                elif rand < 0.90:
                    status = AttendanceStatus.late
                elif rand < 0.95:
                    status = AttendanceStatus.half_day
                else:
                    continue
                check_in = datetime(y, m, d, 9, random.randint(0, 30))
                check_out = datetime(y, m, d, 18, random.randint(0, 30))
                hours = (check_out - check_in).total_seconds() / 3600
                db.add(Attendance(
                    employee_id=emp.id,
                    date=dt,
                    check_in=check_in,
                    check_out=check_out,
                    status=status,
                    total_hours=round(hours, 2),
                ))
    db.commit()

    # Sample leave requests
    leave_scenarios = [
        (emp_objects[0], LeaveType.annual, today - timedelta(days=10), today - timedelta(days=8), LeaveStatus.approved),
        (emp_objects[1], LeaveType.sick, today - timedelta(days=5), today - timedelta(days=4), LeaveStatus.approved),
        (emp_objects[2], LeaveType.casual, today + timedelta(days=3), today + timedelta(days=4), LeaveStatus.pending),
        (emp_objects[3], LeaveType.annual, today + timedelta(days=10), today + timedelta(days=15), LeaveStatus.pending),
        (emp_objects[4], LeaveType.sick, today - timedelta(days=20), today - timedelta(days=19), LeaveStatus.rejected),
    ]

    admin_user = db.query(User).filter(User.email == "admin@empay.com").first()
    for emp, lt, start, end, status in leave_scenarios:
        days = max(1.0, (end - start).days + 1)
        leave = LeaveRequest(
            employee_id=emp.id,
            leave_type=lt,
            start_date=start,
            end_date=end,
            total_days=days,
            reason="Personal / medical reason",
            status=status,
            approved_by=admin_user.id if status != LeaveStatus.pending else None,
            approved_at=datetime.utcnow() if status != LeaveStatus.pending else None,
            rejection_reason="Insufficient balance" if status == LeaveStatus.rejected else None,
        )
        db.add(leave)
        if status == LeaveStatus.approved and lt != LeaveType.unpaid:
            balance = db.query(LeaveBalance).filter(
                LeaveBalance.employee_id == emp.id,
                LeaveBalance.leave_type == lt,
                LeaveBalance.year == today.year,
            ).first()
            if balance:
                balance.used_days += days
    db.commit()

    # Payroll for previous month
    prev_month = today.month - 1 or 12
    prev_year = today.year if today.month > 1 else today.year - 1
    month_name = calendar.month_name[prev_month]
    _, last_day = calendar.monthrange(prev_year, prev_month)

    payrun = Payroll(
        pay_period=f"{month_name} {prev_year}",
        pay_period_start=str(date(prev_year, prev_month, 1)),
        pay_period_end=str(date(prev_year, prev_month, last_day)),
        status=PayrollStatus.processed,
        created_by=admin_user.id,
        processed_at=datetime.utcnow(),
    )
    db.add(payrun)
    db.flush()

    period_start = date(prev_year, prev_month, 1)
    period_end = date(prev_year, prev_month, last_day)

    for emp in emp_objects:
        att = db.query(Attendance).filter(
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
        calc = calculate_payroll_entry(emp, prev_year, prev_month, att, leave_days)
        entry = PayrollEntry(payroll_id=payrun.id, employee_id=emp.id, status=EntryStatus.approved, **calc)
        db.add(entry)

    db.commit()
    print("[EmPay] Seeding complete.")
    print("  admin@empay.com   / Admin@123  (Admin)")
    print("  hr@empay.com      / Admin@123  (HR Officer)")
    print("  payroll@empay.com / Admin@123  (Payroll Officer)")
    print("  arjun@empay.com   / Admin@123  (Employee)")
