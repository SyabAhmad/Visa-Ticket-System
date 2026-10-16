from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import CashOut, Agent
from schemas import CashOutCreate, CashOutUpdate, CashOutOut
from auth import get_current_user
from routers.activity import log_activity
from typing import Optional
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/api/cashouts", tags=["cashouts"])


@router.get("/", response_model=list[CashOutOut])
def list_cashouts(
    agent_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(CashOut).options(joinedload(CashOut.agent))
    if agent_id:
        query = query.filter(CashOut.agent_id == agent_id)
    if search:
        query = query.filter(CashOut.name.ilike(f"%{search}%"))
    cashouts = query.order_by(CashOut.created_at.desc()).all()
    result = []
    for c in cashouts:
        cashout_dict = CashOutOut.model_validate(c)
        cashout_dict.agent_name = c.agent.name if c.agent else ""
        result.append(cashout_dict)
    return result


@router.post("/", response_model=CashOutOut)
def create_cashout(cashout: CashOutCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if cashout.agent_id:
        agent = db.query(Agent).filter(Agent.id == cashout.agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
    db_cashout = CashOut(**cashout.model_dump())
    db.add(db_cashout)
    db.flush()
    log_activity(db, user, "create", "cashout", db_cashout.id, f"Name: {db_cashout.name}, Amount: SAR {db_cashout.amount}")
    db.commit()
    db.refresh(db_cashout)
    result = CashOutOut.model_validate(db_cashout)
    result.agent_name = agent.name if db_cashout.agent else ""
    return result


@router.get("/{cashout_id}", response_model=CashOutOut)
def get_cashout(cashout_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cashout = db.query(CashOut).options(joinedload(CashOut.agent)).filter(CashOut.id == cashout_id).first()
    if not cashout:
        raise HTTPException(status_code=404, detail="Cash out not found")
    result = CashOutOut.model_validate(cashout)
    result.agent_name = cashout.agent.name if cashout.agent else ""
    return result


@router.put("/{cashout_id}", response_model=CashOutOut)
def update_cashout(cashout_id: int, update: CashOutUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cashout = db.query(CashOut).options(joinedload(CashOut.agent)).filter(CashOut.id == cashout_id).first()
    if not cashout:
        raise HTTPException(status_code=404, detail="Cash out not found")
    update_data = update.model_dump(exclude_unset=True)
    agent_name = cashout.agent.name if cashout.agent else ""
    if "agent_id" in update_data and update_data["agent_id"]:
        agent = db.query(Agent).filter(Agent.id == update_data["agent_id"]).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        agent_name = agent.name
    for key, value in update_data.items():
        setattr(cashout, key, value)
    log_activity(db, user, "update", "cashout", cashout.id, f"Name: {cashout.name}, Amount: SAR {cashout.amount}")
    db.commit()
    db.refresh(cashout)
    result = CashOutOut.model_validate(cashout)
    result.agent_name = agent_name
    return result


@router.delete("/{cashout_id}")
def delete_cashout(cashout_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cashout = db.query(CashOut).filter(CashOut.id == cashout_id).first()
    if not cashout:
        raise HTTPException(status_code=404, detail="Cash out not found")
    name = cashout.name
    amount = cashout.amount
    db.delete(cashout)
    log_activity(db, user, "delete", "cashout", cashout_id, f"Name: {name}, Amount: SAR {amount}")
    db.commit()
    return {"detail": "Cash out deleted"}
