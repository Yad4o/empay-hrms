from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    emp_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    department = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    join_date = Column(Date, nullable=False)
    basic_salary = Column(Float, nullable=False)
    hra_percent = Column(Float, default=40.0)
    other_allowances = Column(Float, default=0.0)
    address = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    bank_account = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="employee")
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    leave_balances = relationship("LeaveBalance", back_populates="employee", cascade="all, delete-orphan")
    payroll_entries = relationship("PayrollEntry", back_populates="employee", cascade="all, delete-orphan")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def gross_salary(self):
        hra = self.basic_salary * (self.hra_percent / 100)
        return self.basic_salary + hra + (self.other_allowances or 0)
