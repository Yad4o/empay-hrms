from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import user, employee, attendance, leave, payroll  # noqa: ensure all models registered
from app.database import Base, SessionLocal
from app.routers import auth, employees, attendance as att_router, leaves, payroll as pay_router, reports, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.utils.seed import seed_database
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(title="EmPay HRMS API", version="1.0.0", lifespan=lifespan)

from app.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["Employees"])
app.include_router(att_router.router, prefix="/api/v1/attendance", tags=["Attendance"])
app.include_router(leaves.router, prefix="/api/v1/leaves", tags=["Leaves"])
app.include_router(pay_router.router, prefix="/api/v1/payroll", tags=["Payroll"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["Settings"])

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat() + "Z"}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
