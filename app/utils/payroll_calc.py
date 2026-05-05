import calendar
from datetime import date


STANDARD_WORKING_DAYS = 26


def get_working_days(year: int, month: int) -> int:
    _, days_in_month = calendar.monthrange(year, month)
    working = 0
    for d in range(1, days_in_month + 1):
        if date(year, month, d).weekday() < 5:
            working += 1
    return working


def professional_tax(gross: float) -> float:
    if gross >= 25000:
        return 200.0
    elif gross >= 10000:
        return 150.0
    return 0.0


def calculate_payroll_entry(employee, year: int, month: int, attendance_records, approved_leave_days: float):
    working_days = get_working_days(year, month)

    present_days = 0.0
    for a in attendance_records:
        if a.status in ("present", "late"):
            present_days += 1.0
        elif a.status == "half_day":
            present_days += 0.5

    paid_days = present_days + approved_leave_days
    lop_days = max(0.0, working_days - paid_days)
    absent_days = max(0.0, working_days - present_days - approved_leave_days)

    basic = employee.basic_salary
    hra = basic * (employee.hra_percent / 100)
    other_allowances = employee.other_allowances or 0.0
    gross = basic + hra + other_allowances

    # LOP deduction based on basic / working_days
    daily_rate = basic / working_days if working_days > 0 else 0
    lop_deduction = round(daily_rate * lop_days, 2)

    pf_employee = round(basic * 0.12, 2)
    pf_employer = round(basic * 0.12, 2)
    prof_tax = professional_tax(gross)

    total_deductions = round(lop_deduction + pf_employee + prof_tax, 2)
    net_salary = round(gross - total_deductions, 2)

    return {
        "working_days": working_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "leave_days": approved_leave_days,
        "lop_days": lop_days,
        "basic_salary": basic,
        "hra": round(hra, 2),
        "other_allowances": other_allowances,
        "gross_salary": round(gross, 2),
        "lop_deduction": lop_deduction,
        "pf_employee": pf_employee,
        "pf_employer": pf_employer,
        "professional_tax": prof_tax,
        "other_deductions": 0.0,
        "total_deductions": total_deductions,
        "net_salary": net_salary,
    }
