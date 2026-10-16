from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import ActivityLog
from auth import get_current_user

router = APIRouter(prefix="/api/activity", tags=["activity"])


def log_activity(db, user, action, entity_type, entity_id, details=""):
    log = ActivityLog(
        user_id=user.id,
        username=user.username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(log)
    db.flush()


@router.get("/")
def get_activity(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    total = db.query(ActivityLog).count()
    logs = db.query(ActivityLog).order_by(
        ActivityLog.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "logs": [
            {
                "id": log.id,
                "username": log.username,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "details": log.details,
                "created_at": log.created_at.strftime('%Y-%m-%d %H:%M') if log.created_at else ''
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }
