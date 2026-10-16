from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Agent
from schemas import AgentCreate, AgentUpdate, AgentOut
from auth import get_current_user
from routers.activity import log_activity

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/", response_model=list[AgentOut])
def list_agents(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Agent).all()


@router.post("/", response_model=AgentOut)
def create_agent(agent: AgentCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_agent = Agent(**agent.model_dump())
    db.add(db_agent)
    db.flush()
    log_activity(db, user, "create", "agent", db_agent.id, f"Name: {db_agent.name}")
    db.commit()
    db.refresh(db_agent)
    return db_agent


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(agent_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=AgentOut)
def update_agent(agent_id: int, update: AgentUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(agent, key, value)
    log_activity(db, user, "update", "agent", agent.id, f"Name: {agent.name}")
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    name = agent.name
    db.delete(agent)
    log_activity(db, user, "delete", "agent", agent_id, f"Name: {name}")
    db.commit()
    return {"detail": "Agent deleted"}
