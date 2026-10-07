from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# Auth
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


# User
class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


# Agent
class AgentCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    commission_rate: float = Field(default=10.0, ge=0, le=100)
    status: Literal["active", "inactive"] = "active"


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    commission_rate: Optional[float] = Field(default=None, ge=0, le=100)
    status: Optional[Literal["active", "inactive"]] = None


class AgentOut(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    commission_rate: float
    status: str

    class Config:
        from_attributes = True


# Ticket Booking
class TicketCreate(BaseModel):
    agent_id: int = Field(gt=0)
    pnr_number: str = ""
    passenger_name: str
    contact_number: str = ""
    dob: str = ""
    passport_number: str = ""
    passport_expiry: str = ""
    sector: str = ""
    airline: str = ""
    trip_type: Literal["one_way", "return"] = "one_way"
    departure_date: str
    return_date: str = ""
    total_payment: float = Field(default=0.0, ge=0)
    received_payment: float = Field(default=0.0, ge=0)
    payment_method: Literal["cash", "bank"] = "cash"
    payment_remarks: str = ""
    purchase_rate: float = Field(default=0.0, ge=0)


class TicketUpdate(BaseModel):
    agent_id: Optional[int] = Field(default=None, gt=0)
    pnr_number: Optional[str] = None
    passenger_name: Optional[str] = None
    contact_number: Optional[str] = None
    dob: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[str] = None
    sector: Optional[str] = None
    airline: Optional[str] = None
    trip_type: Optional[Literal["one_way", "return"]] = None
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    total_payment: Optional[float] = Field(default=None, ge=0)
    received_payment: Optional[float] = Field(default=None, ge=0)
    payment_method: Optional[Literal["cash", "bank"]] = None
    payment_remarks: Optional[str] = None
    purchase_rate: Optional[float] = Field(default=None, ge=0)


class TicketOut(BaseModel):
    id: int
    agent_id: Optional[int] = None
    agent_commission_percentage: float
    pnr_number: str
    passenger_name: str
    contact_number: str
    dob: str
    passport_number: str
    passport_expiry: str
    sector: str
    airline: str
    trip_type: str
    departure_date: str
    return_date: str
    total_payment: float
    received_payment: float
    payment_method: str
    payment_remarks: str
    dues: float
    payment_status: str
    purchase_rate: float
    ticket_profit: float
    agent_commission: float
    created_at: datetime
    agent_name: str = ""

    class Config:
        from_attributes = True


# Visa Processing
class VisaCreate(BaseModel):
    agent_id: int = Field(gt=0)
    passenger_name: str
    contact_number: str = ""
    passport_number: str = ""
    dob: str = ""
    passport_expiry: str = ""
    visa_type: str = "umrah"
    visa_number: str = ""
    sponsor_number: str = ""
    occupation: str = ""
    visa_process_charges: float = Field(default=0.0, ge=0)
    medical_token_charges: float = Field(default=0.0, ge=0)
    agreement_paper_charges: float = Field(default=0.0, ge=0)
    extra_charges: float = Field(default=0.0, ge=0)
    received: float = Field(default=0.0, ge=0)
    purchase_rate: float = Field(default=0.0, ge=0)
    agent_commission_percentage: float = Field(default=0.0, ge=0, le=100)
    status: Literal["pending", "approved", "rejected"] = "pending"


class VisaUpdate(BaseModel):
    agent_id: Optional[int] = Field(default=None, gt=0)
    passenger_name: Optional[str] = None
    contact_number: Optional[str] = None
    passport_number: Optional[str] = None
    dob: Optional[str] = None
    passport_expiry: Optional[str] = None
    visa_type: Optional[str] = None
    visa_number: Optional[str] = None
    sponsor_number: Optional[str] = None
    occupation: Optional[str] = None
    visa_process_charges: Optional[float] = Field(default=None, ge=0)
    medical_token_charges: Optional[float] = Field(default=None, ge=0)
    agreement_paper_charges: Optional[float] = Field(default=None, ge=0)
    extra_charges: Optional[float] = Field(default=None, ge=0)
    received: Optional[float] = Field(default=None, ge=0)
    purchase_rate: Optional[float] = Field(default=None, ge=0)
    agent_commission_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    status: Optional[Literal["pending", "approved", "rejected"]] = None


class VisaOut(BaseModel):
    id: int
    agent_id: Optional[int] = None
    passenger_name: str
    contact_number: str
    passport_number: str
    dob: str
    passport_expiry: str
    visa_type: str
    visa_number: str
    sponsor_number: str
    occupation: str
    visa_process_charges: float
    medical_token_charges: float
    agreement_paper_charges: float
    extra_charges: float
    total_charges: float
    received: float
    dues: float
    purchase_rate: float
    commission: float
    agent_commission_percentage: float
    status: str
    created_at: datetime
    agent_name: str = ""

    class Config:
        from_attributes = True


# Cash Out
class CashOutCreate(BaseModel):
    agent_id: Optional[int] = Field(default=None, gt=0)
    visa_id: Optional[int] = Field(default=None, gt=0)
    ticket_id: Optional[int] = Field(default=None, gt=0)
    name: str
    amount: float = Field(default=0.0, ge=0)
    date: str
    payment_method: Literal["cash", "online_bank"] = "cash"
    comments: str = ""


class CashOutUpdate(BaseModel):
    agent_id: Optional[int] = Field(default=None, gt=0)
    visa_id: Optional[int] = Field(default=None, gt=0)
    ticket_id: Optional[int] = Field(default=None, gt=0)
    name: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    date: Optional[str] = None
    payment_method: Optional[Literal["cash", "online_bank"]] = None
    comments: Optional[str] = None


class CashOutOut(BaseModel):
    id: int
    agent_id: Optional[int]
    visa_id: Optional[int]
    ticket_id: Optional[int]
    name: str
    amount: float
    date: str
    payment_method: str
    comments: str
    created_at: datetime
    agent_name: str = ""

    class Config:
        from_attributes = True


# Settings
class SettingCreate(BaseModel):
    key: str
    value: str


class SettingOut(BaseModel):
    id: int
    key: str
    value: str

    class Config:
        from_attributes = True


# Dashboard
class DashboardStats(BaseModel):
    total_tickets: int
    total_visas: int
    total_agents: int
    total_received: float
    total_dues: float
    my_commission: float
    ticket_profit: float
    visa_profit: float
    agent_commission: float
    total_revenue: float
    recent_tickets: list
    recent_visas: list
    monthly_revenue: list
    top_agents: list


# Expense
EXPENSE_CATEGORIES = [
    "office_rent", "utilities", "internet", "electricity", "water",
    "salaries", "transportation", "office_supplies", "maintenance",
    "marketing", "food", "travel", "other",
]


class ExpenseCreate(BaseModel):
    title: str
    category: str = "other"
    amount: float = Field(default=0.0, ge=0)
    date: str = ""
    payment_method: Literal["cash", "bank"] = "cash"
    payment_remarks: str = ""
    notes: str = ""


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    date: Optional[str] = None
    payment_method: Optional[Literal["cash", "bank"]] = None
    payment_remarks: Optional[str] = None
    notes: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    title: str
    category: str
    amount: float
    date: str
    payment_method: str
    payment_remarks: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True
