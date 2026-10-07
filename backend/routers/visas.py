from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import VisaProcessing, Agent
from schemas import VisaCreate, VisaUpdate, VisaOut
from auth import get_current_user
from routers.activity import log_activity
from typing import Optional
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/api/visas", tags=["visas"])


def _calculate_fields(data: dict):
    vp = data.get("visa_process_charges", 0) or 0
    mt = data.get("medical_token_charges", 0) or 0
    ap = data.get("agreement_paper_charges", 0) or 0
    ec = data.get("extra_charges", 0) or 0
    received = data.get("received", 0) or 0
    purchase = data.get("purchase_rate", 0) or 0

    total_charges = round(vp + mt + ap + ec, 2)
    dues = round(total_charges - received, 2)
    commission = round(total_charges - purchase, 2)

    data["total_charges"] = total_charges
    data["dues"] = dues
    data["commission"] = commission
    return data


def _build_out(visa, agent_name=""):
    return VisaOut(
        id=visa.id,
        agent_id=visa.agent_id,
        passenger_name=visa.passenger_name or "",
        contact_number=visa.contact_number or "",
        passport_number=visa.passport_number or "",
        dob=visa.dob or "",
        passport_expiry=visa.passport_expiry or "",
        visa_type=visa.visa_type or "",
        visa_number=visa.visa_number or "",
        sponsor_number=visa.sponsor_number or "",
        occupation=visa.occupation or "",
        visa_process_charges=visa.visa_process_charges or 0,
        medical_token_charges=visa.medical_token_charges or 0,
        agreement_paper_charges=visa.agreement_paper_charges or 0,
        extra_charges=visa.extra_charges or 0,
        total_charges=visa.total_charges or 0,
        received=visa.received or 0,
        dues=visa.dues or 0,
        purchase_rate=visa.purchase_rate or 0,
        commission=visa.commission or 0,
        agent_commission_percentage=visa.agent_commission_percentage or 0,
        status=visa.status or "pending",
        created_at=visa.created_at,
        agent_name=agent_name,
    )


@router.get("/", response_model=list[VisaOut])
def list_visas(
    agent_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(VisaProcessing).options(joinedload(VisaProcessing.agent))
    if agent_id:
        query = query.filter(VisaProcessing.agent_id == agent_id)
    if search:
        query = query.filter(
            VisaProcessing.passenger_name.ilike(f"%{search}%")
            | VisaProcessing.passport_number.ilike(f"%{search}%")
            | VisaProcessing.visa_number.ilike(f"%{search}%")
        )
    visas = query.order_by(VisaProcessing.created_at.desc()).all()
    return [_build_out(v, v.agent.name if v.agent else "") for v in visas]


@router.post("/", response_model=VisaOut)
def create_visa(visa: VisaCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == visa.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    data = visa.model_dump()
    data = _calculate_fields(data)

    db_visa = VisaProcessing(**data)
    db.add(db_visa)
    db.flush()
    log_activity(db, user, "create", "visa", db_visa.id, f"Passenger: {db_visa.passenger_name}")
    db.commit()
    db.refresh(db_visa)
    return _build_out(db_visa, agent.name)


@router.get("/{visa_id}", response_model=VisaOut)
def get_visa(visa_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    visa = db.query(VisaProcessing).options(joinedload(VisaProcessing.agent)).filter(VisaProcessing.id == visa_id).first()
    if not visa:
        raise HTTPException(status_code=404, detail="Visa not found")
    return _build_out(visa, visa.agent.name if visa.agent else "")


@router.put("/{visa_id}", response_model=VisaOut)
def update_visa(visa_id: int, update: VisaUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    visa = db.query(VisaProcessing).options(joinedload(VisaProcessing.agent)).filter(VisaProcessing.id == visa_id).first()
    if not visa:
        raise HTTPException(status_code=404, detail="Visa not found")

    update_data = update.model_dump(exclude_unset=True)
    agent_name = visa.agent.name if visa.agent else ""

    if "agent_id" in update_data and update_data["agent_id"]:
        agent = db.query(Agent).filter(Agent.id == update_data["agent_id"]).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        agent_name = agent.name

    for key, value in update_data.items():
        setattr(visa, key, value)

    merged = {c.key: getattr(visa, c.key) for c in VisaProcessing.__table__.columns}
    merged.update(update_data)
    _calculate_fields(merged)
    for key, value in merged.items():
        if key not in ("id", "created_at", "updated_at"):
            setattr(visa, key, value)

    log_activity(db, user, "update", "visa", visa.id, f"Passenger: {visa.passenger_name}")
    db.commit()
    db.refresh(visa)
    return _build_out(visa, agent_name)


@router.delete("/{visa_id}")
def delete_visa(visa_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    visa = db.query(VisaProcessing).filter(VisaProcessing.id == visa_id).first()
    if not visa:
        raise HTTPException(status_code=404, detail="Visa not found")
    name = visa.passenger_name
    db.delete(visa)
    log_activity(db, user, "delete", "visa", visa_id, f"Passenger: {name}")
    db.commit()
    return {"detail": "Visa deleted"}
