import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.database import Base


class PayrollStatus(str, enum.Enum):
    draft = "draft"
    processed = "processed"
    paid = "paid"


class EntryStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    paid = "paid"


class Payroll(Base):
    __tablename__ = "payruns"

    id = Column(Integer, primary_key=True, index=True)
    pay_period = Column(String, nullable=False)        # e.g., "May 2025"
    pay_period_start = Column(String, nullable=False)
    pay_period_end = Column(String, nullable=False)
    status = Column(Enum(PayrollStatus), default=PayrollStatus.draft)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    creator = relationship("User", foreign_keys=[created_by])
    entries = relationship("PayrollEntry", back_populates="payroll", cascade="all, delete-orphan")


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    id = Column(Integer, primary_key=True, index=True)
    payroll_id = Column(Integer, ForeignKey("payruns.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # Attendance summary
    working_days = Column(Integer, nullable=False, default=26)
    present_days = Column(Float, nullable=False, default=0)
    absent_days = Column(Float, nullable=False, default=0)
    leave_days = Column(Float, nullable=False, default=0)
    lop_days = Column(Float, nullable=False, default=0)

    # Earnings
    basic_salary = Column(Float, nullable=False)
    hra = Column(Float, nullable=False, default=0)
    other_allowances = Column(Float, nullable=False, default=0)
    gross_salary = Column(Float, nullable=False)

    # Deductions
    lop_deduction = Column(Float, nullable=False, default=0)
    pf_employee = Column(Float, nullable=False, default=0)
    pf_employer = Column(Float, nullable=False, default=0)
    professional_tax = Column(Float, nullable=False, default=0)
    other_deductions = Column(Float, nullable=False, default=0)
    total_deductions = Column(Float, nullable=False, default=0)

    # Net
    net_salary = Column(Float, nullable=False)
    status = Column(Enum(EntryStatus), default=EntryStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    payroll = relationship("Payroll", back_populates="entries")
    employee = relationship("Employee", back_populates="payroll_entries")
