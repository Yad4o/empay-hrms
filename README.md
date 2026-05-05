# EmPay – Smart Human Resource Management System

> Simplifying HR & Payroll Operations for Smarter Workplaces

EmPay is a full-stack HRMS built with **FastAPI + SQLite** on the backend and a **vanilla JS SPA** on the frontend. It covers the complete employee lifecycle — from onboarding to payroll generation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 |
| Database | SQLite (via SQLAlchemy ORM) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Frontend | HTML5, CSS3 (custom dark theme), Vanilla JS |
| Charts | Chart.js 4 |

---

## Features

### Role-Based Access Control
| Feature | Admin | HR Officer | Payroll Officer | Employee |
|---|:---:|:---:|:---:|:---:|
| Employee CRUD | ✅ | ✅ | ❌ | View own |
| Attendance (all) | ✅ | ✅ | View | Own only |
| Leave Management | ✅ | ✅ | Approve/Reject | Apply |
| Payroll & Payslips | ✅ | ❌ | ✅ | View own |
| Reports | ✅ | ✅ | ✅ | ❌ |
| Settings / Users | ✅ | ❌ | ❌ | ❌ |

### Modules
- **Dashboard** — Live stats: headcount, present today, pending leaves, payrun history, attendance trend chart, department distribution
- **Employee Management** — Full CRUD with search and department filter; auto-generates employee ID (EMP001…)
- **Attendance** — Mark check-in/check-out, auto-calculates total hours; admin/HR view all records
- **Time Off / Leaves** — Apply, approve, reject workflow; tracks leave balances (Annual 12d, Sick 6d, Casual 6d); LOP auto-calculated for unpaid
- **Payroll Engine** — Generates payrun for any period; calculates per-employee net pay with PF and professional tax
- **Payslips** — Printable payslip per employee per payrun; accessible by employee for own slips
- **Reports** — Monthly attendance summary + leave report
- **Settings** — Admin-only user management with role assignment

### Payroll Calculation
```
Gross  = Basic + HRA (40% of Basic) + Other Allowances
LOP    = (Basic / Working Days) × Unauthorized Absent Days
PF Emp = Basic × 12%
Prof Tax = ₹200 (Gross ≥ ₹25K) | ₹150 (Gross ≥ ₹10K) | ₹0
Net    = Gross − LOP − PF Employee − Professional Tax
```

---

## Quick Start

```bash
git clone https://github.com/Yad4o/empay-hrms.git
cd empay-hrms

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload
```

Open **http://localhost:8000** — demo data is seeded automatically on first run.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@empay.com | Admin@123 |
| HR Officer | hr@empay.com | Admin@123 |
| Payroll Officer | payroll@empay.com | Admin@123 |
| Employee | arjun@empay.com | Admin@123 |

---

## API Reference

Base URL: `http://localhost:8000/api/v1`

Interactive docs available at `/docs` (Swagger UI).

| Endpoint | Description |
|---|---|
| `POST /auth/login` | JWT login |
| `GET  /employees` | List employees |
| `POST /employees` | Create employee |
| `POST /attendance/mark` | Check in / Check out |
| `GET  /attendance` | All attendance records |
| `POST /leaves/apply` | Apply for leave |
| `PUT  /leaves/{id}/approve` | Approve leave |
| `POST /payroll` | Generate payrun |
| `GET  /payroll/{id}/entries` | View payrun entries |
| `GET  /payroll/entry/{id}/payslip` | Get payslip |
| `GET  /reports/dashboard` | Dashboard metrics |

---

## Project Structure

```
empay-hrms/
├── app/
│   ├── main.py              # FastAPI app, lifespan, routers
│   ├── database.py          # SQLAlchemy engine & session
│   ├── config.py            # Settings (SECRET_KEY, DB URL)
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # API route handlers
│   └── utils/               # JWT auth, payroll calc, seed data
└── frontend/
    ├── index.html           # Login page
    ├── app.html             # Main SPA shell (sidebar + content)
    ├── payslip.html         # Printable payslip
    ├── css/style.css        # Dark theme design system
    └── js/
        ├── api.js           # Fetch wrapper with JWT injection
        ├── auth.js          # Token storage & role helpers
        ├── app.js           # SPA router, navigation, toast/modal
        └── views/           # Per-page JS modules
```
