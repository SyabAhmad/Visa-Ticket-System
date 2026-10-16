from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    full_name = Column(String, default="")
    role = Column(String, default="admin")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, default="")
    email = Column(String, default="")
    commission_rate = Column(Float, default=10.0)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tickets = relationship("TicketBooking", back_populates="agent")
    visas = relationship("VisaProcessing", back_populates="agent")
    cashouts = relationship("CashOut", back_populates="agent")


class TicketBooking(Base):
    __tablename__ = "ticket_bookings"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    agent_commission_percentage = Column(Float, default=0.0)

    pnr_number = Column(String, default="")

    passenger_name = Column(String)
    contact_number = Column(String, default="")
    dob = Column(String, default="")
    passport_number = Column(String, default="")
    passport_expiry = Column(String, default="")

    sector = Column(String, default="")
    airline = Column(String, default="")

    trip_type = Column(String, default="one_way")
    departure_date = Column(String, default="")
    return_date = Column(String, default="")

    total_payment = Column(Float, default=0.0)
    received_payment = Column(Float, default=0.0)
    payment_method = Column(String, default="cash")
    payment_remarks = Column(Text, default="")
    dues = Column(Float, default=0.0)
    payment_status = Column(String, default="pending")

    purchase_rate = Column(Float, default=0.0)
    ticket_profit = Column(Float, default=0.0)
    agent_commission = Column(Float, default=0.0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    agent = relationship("Agent", back_populates="tickets")


class VisaProcessing(Base):
    __tablename__ = "visa_processings"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)

    passenger_name = Column(String)
    contact_number = Column(String, default="")
    passport_number = Column(String, default="")
    dob = Column(String, default="")
    passport_expiry = Column(String, default="")
    visa_type = Column(String, default="umrah")
    visa_number = Column(String, default="")
    sponsor_number = Column(String, default="")
    occupation = Column(String, default="")

    visa_process_charges = Column(Float, default=0.0)
    medical_token_charges = Column(Float, default=0.0)
    agreement_paper_charges = Column(Float, default=0.0)
    extra_charges = Column(Float, default=0.0)
    total_charges = Column(Float, default=0.0)

    received = Column(Float, default=0.0)
    dues = Column(Float, default=0.0)

    purchase_rate = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    agent_commission_percentage = Column(Float, default=0.0)

    status = Column(String, default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    agent = relationship("Agent", back_populates="visas")


class CashOut(Base):
    __tablename__ = "cashouts"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    visa_id = Column(Integer, ForeignKey("visa_processings.id", ondelete="SET NULL"), nullable=True)
    ticket_id = Column(Integer, ForeignKey("ticket_bookings.id", ondelete="SET NULL"), nullable=True)
    name = Column(String)
    amount = Column(Float, default=0.0)
    date = Column(String)
    payment_method = Column(String, default="cash")
    comments = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    agent = relationship("Agent", back_populates="cashouts")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username = Column(String, default="")
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(Integer)
    details = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, default="other")
    amount = Column(Float, default=0.0)
    date = Column(String, default="")
    payment_method = Column(String, default="cash")
    payment_remarks = Column(Text, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
