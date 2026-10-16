from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import TicketBooking, Agent
from schemas import TicketCreate, TicketUpdate, TicketOut
from auth import get_current_user
from routers.activity import log_activity
from typing import Optional
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def _calculate_fields(data: dict, agent: Agent = None, existing: TicketBooking = None):
    total = data.get("total_payment", existing.total_payment if existing else 0) or 0
    received = data.get("received_payment", existing.received_payment if existing else 0) or 0
    purchase = data.get("purchase_rate", existing.purchase_rate if existing else 0) or 0

    dues = round(total - received, 2)
    ticket_profit = round(total - purchase, 2)

    pct = 0
    if agent:
        pct = agent.commission_rate or 0
    elif existing:
        pct = existing.agent_commission_percentage or 0

    agent_commission = round(ticket_profit * pct / 100, 2)

    data["dues"] = dues
    data["ticket_profit"] = ticket_profit
    data["agent_commission"] = agent_commission

    if dues <= 0:
        data["payment_status"] = "paid"
    elif received > 0:
        data["payment_status"] = "partial"
    else:
        data["payment_status"] = "pending"

    return data


def _build_out(ticket, agent_name=""):
    return TicketOut(
        id=ticket.id,
        agent_id=ticket.agent_id,
        agent_commission_percentage=ticket.agent_commission_percentage or 0,
        pnr_number=ticket.pnr_number or "",
        passenger_name=ticket.passenger_name or "",
        contact_number=ticket.contact_number or "",
        dob=ticket.dob or "",
        passport_number=ticket.passport_number or "",
        passport_expiry=ticket.passport_expiry or "",
        sector=ticket.sector or "",
        airline=ticket.airline or "",
        trip_type=ticket.trip_type or "one_way",
        departure_date=ticket.departure_date or "",
        return_date=ticket.return_date or "",
        total_payment=ticket.total_payment or 0,
        received_payment=ticket.received_payment or 0,
        payment_method=ticket.payment_method or "cash",
        payment_remarks=ticket.payment_remarks or "",
        dues=ticket.dues or 0,
        payment_status=ticket.payment_status or "pending",
        purchase_rate=ticket.purchase_rate or 0,
        ticket_profit=ticket.ticket_profit or 0,
        agent_commission=ticket.agent_commission or 0,
        created_at=ticket.created_at,
        agent_name=agent_name,
    )


@router.get("/", response_model=list[TicketOut])
def list_tickets(
    agent_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(TicketBooking).options(joinedload(TicketBooking.agent))
    if agent_id:
        query = query.filter(TicketBooking.agent_id == agent_id)
    if search:
        query = query.filter(
            TicketBooking.passenger_name.ilike(f"%{search}%")
            | TicketBooking.pnr_number.ilike(f"%{search}%")
            | TicketBooking.passport_number.ilike(f"%{search}%")
        )
    tickets = query.order_by(TicketBooking.created_at.desc()).all()
    return [_build_out(t, t.agent.name if t.agent else "") for t in tickets]


@router.post("/", response_model=TicketOut)
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == ticket.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    data = ticket.model_dump()
    if ticket.trip_type == "one_way":
        data["return_date"] = ""

    data["agent_commission_percentage"] = agent.commission_rate or 0
    data = _calculate_fields(data, agent=agent)

    db_ticket = TicketBooking(**data)
    db.add(db_ticket)
    db.flush()
    log_activity(db, user, "create", "ticket", db_ticket.id, f"Passenger: {db_ticket.passenger_name}")
    db.commit()
    db.refresh(db_ticket)
    return _build_out(db_ticket, agent.name)


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ticket = db.query(TicketBooking).options(joinedload(TicketBooking.agent)).filter(TicketBooking.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _build_out(ticket, ticket.agent.name if ticket.agent else "")


@router.put("/{ticket_id}", response_model=TicketOut)
def update_ticket(ticket_id: int, update: TicketUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ticket = db.query(TicketBooking).options(joinedload(TicketBooking.agent)).filter(TicketBooking.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = update.model_dump(exclude_unset=True)

    if "agent_id" in update_data and update_data["agent_id"]:
        agent = db.query(Agent).filter(Agent.id == update_data["agent_id"]).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        update_data["agent_commission_percentage"] = agent.commission_rate or 0

    if "trip_type" in update_data and update_data["trip_type"] == "one_way":
        update_data["return_date"] = ""

    for key, value in update_data.items():
        setattr(ticket, key, value)

    _calculate_fields(update_data, existing=ticket)
    for key, value in update_data.items():
        setattr(ticket, key, value)

    log_activity(db, user, "update", "ticket", ticket.id, f"Passenger: {ticket.passenger_name}")
    db.commit()
    db.refresh(ticket)

    agent_name = ticket.agent.name if ticket.agent else ""
    return _build_out(ticket, agent_name)


@router.delete("/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ticket = db.query(TicketBooking).filter(TicketBooking.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    name = ticket.passenger_name
    db.delete(ticket)
    log_activity(db, user, "delete", "ticket", ticket_id, f"Passenger: {name}")
    db.commit()
    return {"detail": "Ticket deleted"}
