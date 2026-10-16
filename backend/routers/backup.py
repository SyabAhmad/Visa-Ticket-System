import os
import shutil
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db, DATABASE_URL, IS_SQLITE
from models import Agent, TicketBooking, VisaProcessing, CashOut, Settings, User
from auth import get_current_user

router = APIRouter(prefix="/api/backup", tags=["backup"])
logger = logging.getLogger(__name__)

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups")


@router.get("/export")
def export_database(user=Depends(get_current_user)):
    try:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        os.makedirs(BACKUP_DIR, exist_ok=True)

        if IS_SQLITE:
            db_path = DATABASE_URL.replace("sqlite:///", "")
            if not os.path.isabs(db_path):
                db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_path)
            if not os.path.exists(db_path):
                raise HTTPException(status_code=500, detail="SQLite database file not found")
            backup_file = os.path.join(BACKUP_DIR, f"visa_backup_{timestamp}.db")
            shutil.copy2(db_path, backup_file)
            return FileResponse(
                path=backup_file,
                filename=f"visa_backup_{timestamp}.db",
                media_type="application/octet-stream",
            )
        else:
            from urllib.parse import urlparse
            import subprocess
            parsed = urlparse(DATABASE_URL)
            pg = {
                "host": parsed.hostname or "localhost",
                "port": str(parsed.port or 5432),
                "user": parsed.username or "postgres",
                "dbname": parsed.path.lstrip("/") or "visa_ticket_system",
                "password": parsed.password or "",
            }
            backup_file = os.path.join(BACKUP_DIR, f"visa_backup_{timestamp}.sql")
            env = os.environ.copy()
            env["PGPASSWORD"] = pg["password"]
            subprocess.run([
                "pg_dump", "-h", pg["host"], "-p", pg["port"],
                "-U", pg["user"], "-d", pg["dbname"], "-f", backup_file,
            ], env=env, check=True, capture_output=True)
            return FileResponse(
                path=backup_file,
                filename=f"visa_backup_{timestamp}.sql",
                media_type="application/octet-stream",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


@router.post("/import")
def import_database(file_path: str = "", user=Depends(get_current_user)):
    raise HTTPException(status_code=400, detail="Import not supported. Restore from backup file manually.")


@router.get("/stats")
def backup_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    backups = []
    if os.path.exists(BACKUP_DIR):
        for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
            if f.endswith(('.sql', '.db')):
                fpath = os.path.join(BACKUP_DIR, f)
                fsize = os.path.getsize(fpath)
                ftime = os.path.getmtime(fpath)
                backups.append({
                    "filename": f,
                    "size": fsize,
                    "size_formatted": f"{fsize / 1024:.1f} KB" if fsize < 1024*1024 else f"{fsize / (1024*1024):.1f} MB",
                    "date": datetime.fromtimestamp(ftime).isoformat(),
                })

    return {
        "records": {
            "users": db.query(User).count(),
            "agents": db.query(Agent).count(),
            "tickets": db.query(TicketBooking).count(),
            "visas": db.query(VisaProcessing).count(),
            "cashouts": db.query(CashOut).count(),
            "settings": db.query(Settings).count(),
        },
        "backups": backups[:10],
    }
