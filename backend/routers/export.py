import csv
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import TicketBooking, VisaProcessing, CashOut, Agent
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["export"])


def tickets_to_csv(tickets):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'ID', 'Agent', 'PNR', 'Passenger', 'Contact', 'DOB', 'Passport', 'Passport Expiry',
        'Airline', 'Sector', 'Trip Type', 'Departure', 'Return',
        'Total Payment', 'Received Payment', 'Dues', 'Purchase Rate',
        'Ticket Profit', 'Agent Commission', 'Payment Status', 'Remarks', 'Created At'
    ])
    for t in tickets:
        writer.writerow([
            t.id, t.agent_name, t.pnr_number, t.passenger_name, t.contact_number, t.dob, t.passport_number,
            t.passport_expiry, t.airline, t.sector, t.trip_type, t.departure_date, t.return_date,
            t.total_payment, t.received_payment, t.dues, t.purchase_rate,
            t.ticket_profit, t.agent_commission, t.payment_status, t.payment_remarks,
            t.created_at.strftime('%Y-%m-%d %H:%M') if t.created_at else ''
        ])
    output.seek(0)
    return output


def visas_to_csv(visas):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'ID', 'Agent', 'Passenger', 'Contact', 'Passport', 'DOB', 'Passport Expiry',
        'Visa Type', 'Visa Number', 'Sponsor Number', 'Occupation',
        'Visa Process Charges', 'Medical Token Charges', 'Agreement Paper Charges',
        'Extra Charges', 'Total Charges', 'Received', 'Dues',
        'Purchase Rate', 'Commission', 'Status', 'Created At'
    ])
    for v in visas:
        writer.writerow([
            v.id, v.agent_name, v.passenger_name, v.contact_number, v.passport_number,
            v.dob, v.passport_expiry, v.visa_type, v.visa_number, v.sponsor_number,
            v.occupation, v.visa_process_charges, v.medical_token_charges,
            v.agreement_paper_charges, v.extra_charges, v.total_charges,
            v.received, v.dues, v.purchase_rate, v.commission,
            v.status, v.created_at.strftime('%Y-%m-%d %H:%M') if v.created_at else ''
        ])
    output.seek(0)
    return output


def cashouts_to_csv(cashouts):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'ID', 'Agent', 'Name', 'Amount', 'Date', 'Payment Method',
        'Comments', 'Created At'
    ])
    for c in cashouts:
        writer.writerow([
            c.id, c.agent_name, c.name, c.amount, c.date,
            c.payment_method, c.comments,
            c.created_at.strftime('%Y-%m-%d %H:%M') if c.created_at else ''
        ])
    output.seek(0)
    return output


def enrich_tickets(db, tickets):
    agents = {a.id: a.name for a in db.query(Agent).all()}
    for t in tickets:
        t.agent_name = agents.get(t.agent_id, '')
    return tickets


def enrich_visas(db, visas):
    agents = {a.id: a.name for a in db.query(Agent).all()}
    for v in visas:
        v.agent_name = agents.get(v.agent_id, '')
    return visas


def enrich_cashouts(db, cashouts):
    agents = {a.id: a.name for a in db.query(Agent).all()}
    for c in cashouts:
        c.agent_name = agents.get(c.agent_id, '')
    return cashouts


@router.get("/tickets/export")
def export_tickets(
    agent_id: int = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    query = db.query(TicketBooking)
    if agent_id:
        query = query.filter(TicketBooking.agent_id == agent_id)
    if search:
        query = query.filter(TicketBooking.passenger_name.ilike(f"%{search}%"))
    tickets = query.order_by(TicketBooking.created_at.desc()).all()
    tickets = enrich_tickets(db, tickets)
    csv_data = tickets_to_csv(tickets)
    return StreamingResponse(
        iter([csv_data.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tickets_export.csv"}
    )


@router.get("/visas/export")
def export_visas(
    agent_id: int = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    query = db.query(VisaProcessing)
    if agent_id:
        query = query.filter(VisaProcessing.agent_id == agent_id)
    if search:
        query = query.filter(VisaProcessing.passenger_name.ilike(f"%{search}%"))
    visas = query.order_by(VisaProcessing.created_at.desc()).all()
    visas = enrich_visas(db, visas)
    csv_data = visas_to_csv(visas)
    return StreamingResponse(
        iter([csv_data.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=visas_export.csv"}
    )


@router.get("/cashouts/export")
def export_cashouts(
    agent_id: int = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    query = db.query(CashOut)
    if agent_id:
        query = query.filter(CashOut.agent_id == agent_id)
    if search:
        query = query.filter(CashOut.name.ilike(f"%{search}%"))
    cashouts = query.order_by(CashOut.created_at.desc()).all()
    cashouts = enrich_cashouts(db, cashouts)
    csv_data = cashouts_to_csv(cashouts)
    return StreamingResponse(
        iter([csv_data.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cashouts_export.csv"}
    )
