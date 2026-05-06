from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, field_serializer


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: str
    designation: str
    join_date: date
    basic_salary: float
    hra_percent: float = 40.0
    other_allowances: float = 0.0
    address: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    password: str = "Employee@123"


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    basic_salary: Optional[float] = None
    hra_percent: Optional[float] = None
    other_allowances: Optional[float] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeOut(BaseModel):
    id: int
    user_id: Optional[int]
    emp_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    department: str
    designation: str
    join_date: date
    basic_salary: float
    hra_percent: float
    other_allowances: float
    gross_salary: float = 0.0
    address: Optional[str]
    gender: Optional[str]
    date_of_birth: Optional[date]
    bank_account: Optional[str]
    ifsc_code: Optional[str]
    pan_number: Optional[str]
    is_active: bool

    @field_serializer('gross_salary')
    def serialize_gross_salary(self, value: float, _info):
        return self.basic_salary + (self.basic_salary * self.hra_percent / 100) + self.other_allowances

    class Config:
        from_attributes = True
