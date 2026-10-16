from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import TicketBooking, VisaProcessing, Agent
from auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("/")
def list_payments(
    agent_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    agents = {a.id: a.name for a in db.query(Agent).all()}
    records = []

    tickets = db.query(TicketBooking).options(joinedload(TicketBooking.agent)).all()
    for t in tickets:
        if t.received_payment and t.received_payment > 0:
            if agent_id and t.agent_id != agent_id:
                continue
            if search and search.lower() not in (t.passenger_name or "").lower() and search.lower() not in (t.pnr_number or "").lower():
                continue
            records.append({
                "id": t.id,
                "type": "ticket",
                "passenger_name": t.passenger_name or "",
                "agent_name": t.agent.name if t.agent else "",
                "agent_id": t.agent_id,
                "booking_ref": t.pnr_number or "",
                "total_amount": t.total_payment or 0,
                "received": t.received_payment or 0,
                "dues": t.dues or 0,
                "payment_method": t.payment_method or "cash",
                "payment_remarks": t.payment_remarks or "",
                "date": t.departure_date or "",
                "created_at": t.created_at.isoformat() if t.created_at else "",
            })

    visas = db.query(VisaProcessing).options(joinedload(VisaProcessing.agent)).all()
    for v in visas:
        if v.received and v.received > 0:
            if agent_id and v.agent_id != agent_id:
                continue
            if search and search.lower() not in (v.passenger_name or "").lower() and search.lower() not in (v.visa_number or "").lower():
                continue
            records.append({
                "id": v.id,
                "type": "visa",
                "passenger_name": v.passenger_name or "",
                "agent_name": v.agent.name if v.agent else "",
                "agent_id": v.agent_id,
                "booking_ref": v.visa_number or "",
                "total_amount": v.total_charges or 0,
                "received": v.received or 0,
                "dues": v.dues or 0,
                "payment_method": "cash",
                "payment_remarks": "",
                "date": "",
                "created_at": v.created_at.isoformat() if v.created_at else "",
            })

    records.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    if type == "ticket":
        records = [r for r in records if r["type"] == "ticket"]
    elif type == "visa":
        records = [r for r in records if r["type"] == "visa"]

    return records


@router.get("/summary")
def payment_summary(
    agent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    ticket_q = db.query(TicketBooking)
    visa_q = db.query(VisaProcessing)
    if agent_id:
        ticket_q = ticket_q.filter(TicketBooking.agent_id == agent_id)
        visa_q = visa_q.filter(VisaProcessing.agent_id == agent_id)

    total_ticket_received = ticket_q.with_entities(func.sum(TicketBooking.received_payment)).scalar() or 0
    total_visa_received = visa_q.with_entities(func.sum(VisaProcessing.received)).scalar() or 0
    total_ticket_dues = ticket_q.with_entities(func.sum(TicketBooking.dues)).scalar() or 0
    total_visa_dues = visa_q.with_entities(func.sum(VisaProcessing.dues)).scalar() or 0

    total_received = total_ticket_received + total_visa_received
    total_dues = total_ticket_dues + total_visa_dues
    total_expected = total_received + total_dues

    return {
        "total_received": total_received,
        "total_dues": total_dues,
        "total_expected": total_expected,
        "ticket_received": total_ticket_received,
        "visa_received": total_visa_received,
        "ticket_dues": total_ticket_dues,
        "visa_dues": total_visa_dues,
    }
