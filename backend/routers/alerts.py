from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models import TicketBooking, VisaProcessing, Agent
from auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/passport-expiry")
def get_passport_expiry_alerts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    agents = {a.id: a.name for a in db.query(Agent).all()}
    today = datetime.now()
    threshold = today + timedelta(days=30)

    alerts = []

    tickets = db.query(TicketBooking).filter(
        TicketBooking.passport_expiry != "",
        TicketBooking.passport_expiry.isnot(None)
    ).all()

    for t in tickets:
        try:
            expiry = datetime.strptime(t.passport_expiry, "%Y-%m-%d")
            if expiry <= threshold:
                days_left = (expiry - today).days
                alerts.append({
                    "type": "ticket",
                    "id": t.id,
                    "passenger_name": t.passenger_name,
                    "passport_number": t.passport_number,
                    "passport_expiry": t.passport_expiry,
                    "days_left": max(0, days_left),
                    "agent_name": agents.get(t.agent_id, ""),
                    "status": "expired" if days_left <= 0 else "expiring_soon"
                })
        except ValueError:
            pass

    alerts.sort(key=lambda x: x["days_left"])
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/pending-payments")
def get_pending_payment_alerts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    agents = {a.id: a.name for a in db.query(Agent).all()}

    alerts = []

    tickets = db.query(TicketBooking).filter(
        TicketBooking.payment_status.in_(["pending", "partial"])
    ).all()

    for t in tickets:
        due = t.dues
        if due > 0:
            created = t.created_at or datetime.now()
            days_overdue = (datetime.now() - created).days
            alerts.append({
                "type": "ticket",
                "id": t.id,
                "passenger_name": t.passenger_name,
                "agent_name": agents.get(t.agent_id, ""),
                "amount_due": due,
                "total_payment": t.total_payment,
                "payment_received": t.received_payment,
                "days_overdue": days_overdue,
                "payment_status": t.payment_status
            })

    visas = db.query(VisaProcessing).all()
    for v in visas:
        due = v.dues
        if due > 0:
            created = v.created_at or datetime.now()
            days_overdue = (datetime.now() - created).days
            alerts.append({
                "type": "visa",
                "id": v.id,
                "passenger_name": v.passenger_name,
                "agent_name": agents.get(v.agent_id, ""),
                "amount_due": due,
                "total_charges": v.total_charges,
                "received": v.received,
                "days_overdue": days_overdue,
                "payment_status": v.status
            })

    alerts.sort(key=lambda x: x["days_overdue"], reverse=True)
    total_due = sum(a["amount_due"] for a in alerts)
    return {"alerts": alerts, "count": len(alerts), "total_due": total_due}
