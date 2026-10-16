from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta, timezone
from database import get_db
from models import TicketBooking, VisaProcessing, Agent
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_date_filter(period):
    now = datetime.now(timezone.utc)
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        return now - timedelta(days=7)
    elif period == "month":
        return now - timedelta(days=30)
    elif period == "year":
        return now - timedelta(days=365)
    return None


@router.get("/")
def get_dashboard(
    period: str = Query("all", regex="^(today|week|month|year|all)$"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    date_from = get_date_filter(period)

    # ── Tickets ──
    ticket_query = db.query(TicketBooking)
    if date_from:
        ticket_query = ticket_query.filter(TicketBooking.created_at >= date_from)
    total_tickets = ticket_query.count()

    # ── Visas ──
    visa_query = db.query(VisaProcessing)
    if date_from:
        visa_query = visa_query.filter(VisaProcessing.created_at >= date_from)
    total_visas = visa_query.count()

    # ── Agents ──
    total_agents = db.query(Agent).count()

    # ── Total Received (from customers) ──
    ticket_received = ticket_query.with_entities(func.sum(TicketBooking.received_payment)).scalar() or 0
    visa_received = visa_query.with_entities(func.sum(VisaProcessing.received)).scalar() or 0
    total_received = ticket_received + visa_received

    # ── Total Dues (still owed by customers) ──
    ticket_dues = ticket_query.with_entities(func.sum(TicketBooking.dues)).scalar() or 0
    visa_dues = visa_query.with_entities(func.sum(VisaProcessing.dues)).scalar() or 0
    total_dues = ticket_dues + visa_dues

    # ── My Commission / Business Profit ──
    # Ticket profit = total_payment - purchase_rate
    # Visa profit/commission = total_charges - purchase_rate
    # This is the owner's profit, NOT agent commission
    ticket_profit = ticket_query.with_entities(func.sum(TicketBooking.ticket_profit)).scalar() or 0
    visa_profit = visa_query.with_entities(func.sum(VisaProcessing.commission)).scalar() or 0
    my_commission = ticket_profit + visa_profit

    # ── Agent Commission (owed to agents) ──
    agent_commission_ticket = ticket_query.with_entities(func.sum(TicketBooking.agent_commission)).scalar() or 0

    # ── Recent tickets ──
    recent_tickets_raw = db.query(TicketBooking).order_by(TicketBooking.created_at.desc()).limit(5).all()
    agents_map = {a.id: a.name for a in db.query(Agent).all()}
    recent_tickets = [
        {
            "id": t.id,
            "passenger_name": t.passenger_name,
            "airline": t.airline,
            "sector": t.sector,
            "departure_date": t.departure_date,
            "total_payment": t.total_payment,
            "received_payment": t.received_payment,
            "dues": t.dues,
            "payment_status": t.payment_status,
            "agent_name": agents_map.get(t.agent_id, ""),
        }
        for t in recent_tickets_raw
    ]

    # ── Recent visas ──
    recent_visas_raw = db.query(VisaProcessing).order_by(VisaProcessing.created_at.desc()).limit(5).all()
    recent_visas = [
        {
            "id": v.id,
            "passenger_name": v.passenger_name,
            "visa_type": v.visa_type,
            "total_charges": v.total_charges,
            "received": v.received,
            "dues": v.dues,
            "status": v.status,
            "agent_name": agents_map.get(v.agent_id, ""),
        }
        for v in recent_visas_raw
    ]

    # ── Monthly revenue (last 6 months) ──
    monthly_revenue = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_month = (month_date + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_month = now + timedelta(days=1)

        ticket_rev = db.query(func.sum(TicketBooking.total_payment)).filter(
            TicketBooking.created_at >= month_start,
            TicketBooking.created_at < next_month
        ).scalar() or 0

        visa_rev = db.query(func.sum(VisaProcessing.total_charges)).filter(
            VisaProcessing.created_at >= month_start,
            VisaProcessing.created_at < next_month
        ).scalar() or 0

        monthly_revenue.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": ticket_rev + visa_rev
        })

    # ── Top agents by revenue ──
    agent_revenues = []
    for agent in db.query(Agent).filter(Agent.status == "active").all():
        ticket_rev = db.query(func.sum(TicketBooking.total_payment)).filter(
            TicketBooking.agent_id == agent.id
        ).scalar() or 0
        visa_rev = db.query(func.sum(VisaProcessing.total_charges)).filter(
            VisaProcessing.agent_id == agent.id
        ).scalar() or 0
        ticket_comm = db.query(func.sum(TicketBooking.agent_commission)).filter(
            TicketBooking.agent_id == agent.id
        ).scalar() or 0
        total = ticket_rev + visa_rev
        if total > 0:
            agent_revenues.append({
                "id": agent.id,
                "name": agent.name,
                "revenue": total,
                "commission": ticket_comm
            })
    agent_revenues.sort(key=lambda x: x["revenue"], reverse=True)
    top_agents = agent_revenues[:5]

    return {
        "total_tickets": total_tickets,
        "total_visas": total_visas,
        "total_agents": total_agents,
        "total_received": total_received,
        "total_dues": total_dues,
        "my_commission": my_commission,
        "ticket_profit": ticket_profit,
        "visa_profit": visa_profit,
        "agent_commission": agent_commission_ticket,
        "total_revenue": ticket_received + visa_received,
        "recent_tickets": recent_tickets,
        "recent_visas": recent_visas,
        "monthly_revenue": monthly_revenue,
        "top_agents": top_agents,
    }
