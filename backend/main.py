import os
import sys
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

IS_SQLITE = os.getenv("DATABASE_URL", "sqlite:///data.db").startswith("sqlite")

def print_header(text):
    print(f"\n{'='*50}")
    print(f"  {text}")
    print(f"{'='*50}")

def print_ok(text):
    print(f"  [OK] {text}")

def print_fail(text):
    print(f"  [FAIL] {text}")

def print_info(text):
    print(f"  [..] {text}")

def run_startup_checks():
    print_header("Visa & Ticket System - Starting Up")

    if IS_SQLITE:
        from database import DATABASE_URL
        db_path = DATABASE_URL.replace("sqlite:///", "")
        os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)
        print_ok(f"SQLite database: {db_path}")
    else:
        print_info("Connecting to PostgreSQL...")
        import psycopg2
        from urllib.parse import urlparse
        parsed = urlparse(os.getenv("DATABASE_URL", ""))
        try:
            conn = psycopg2.connect(
                host=parsed.hostname, port=parsed.port or 5432,
                user=parsed.username, password=parsed.password,
                dbname="postgres"
            )
            conn.close()
            print_ok("PostgreSQL connection successful")
        except Exception as e:
            print_fail(f"Cannot connect to PostgreSQL: {e}")
            return False

        print_info("Creating database if needed...")
        try:
            conn = psycopg2.connect(
                host=parsed.hostname, port=parsed.port or 5432,
                user=parsed.username, password=parsed.password,
                dbname="postgres"
            )
            conn.autocommit = True
            cur = conn.cursor()
            db_name = parsed.path.lstrip("/")
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
            if not cur.fetchone():
                cur.execute(f'CREATE DATABASE "{db_name}"')
            cur.close()
            conn.close()
        except Exception as e:
            print_fail(f"Database creation error: {e}")
            return False

    print_info("Creating database tables...")
    from database import engine, Base
    from models import User, Settings, ActivityLog, TicketBooking, VisaProcessing, CashOut, Agent, Expense
    try:
        Base.metadata.create_all(bind=engine)
        print_ok("Tables ready")
    except Exception as e:
        print_fail(f"Table creation error: {e}")
        return False

    print_info("Setting up initial data...")
    from database import SessionLocal
    from auth import get_password_hash
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            db.add(User(
                username="admin",
                password=get_password_hash("admin123"),
                full_name="Administrator",
                role="admin",
            ))
            db.commit()
            print_ok("Admin user created (admin / admin123)")
        else:
            print_ok("Admin user exists")

        defaults = [
            ("visa_types", "umrah,work,tourist,business,student"),
            ("visa_packages", "basic,standard,premium"),
            ("payment_methods", "cash,online_bank"),
            ("airlines", "saudi airlines,emirates,qatar airways,flynas,air arabia"),
            ("ticket_statuses", "pending,confirmed,cancelled"),
            ("visa_statuses", "pending,approved,rejected"),
        ]
        added = 0
        for key, value in defaults:
            if not db.query(Settings).filter(Settings.key == key).first():
                db.add(Settings(key=key, value=value))
                added += 1
        db.commit()
        if added > 0:
            print_ok(f"Default settings added ({added} new)")
        else:
            print_ok("Default settings exist")
    except Exception as e:
        print_fail(f"Seed error: {e}")
        return False
    finally:
        db.close()

    backup_dir = os.path.join(os.path.dirname(__file__), "backups")
    os.makedirs(backup_dir, exist_ok=True)

    print_header("All checks passed! Server starting...")
    return True


# ============================================================
# APP START
# ============================================================

from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import engine, get_db, Base
from models import User, Settings
from schemas import LoginRequest, TokenResponse, UserOut, SettingCreate, RefreshTokenRequest
from auth import (
    get_password_hash, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user, SECRET_KEY
)
from routers import agents, tickets, visas, cashouts, settings, dashboard, backup, export, alerts, activity, payments, expenses
from schemas import PasswordChangeRequest
import apscheduler.schedulers.background
from apscheduler.schedulers.background import BackgroundScheduler

app = FastAPI(title="Visa Ticket System")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(agents.router)
app.include_router(tickets.router)
app.include_router(visas.router)
app.include_router(cashouts.router)
app.include_router(payments.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(backup.router)
app.include_router(export.router)
app.include_router(alerts.router)
app.include_router(activity.router)
app.include_router(expenses.router)


BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

def automated_backup():
    try:
        import shutil
        from database import DATABASE_URL
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        if IS_SQLITE:
            db_path = DATABASE_URL.replace("sqlite:///", "")
            if os.path.exists(db_path):
                backup_file = os.path.join(BACKUP_DIR, f"backup_{timestamp}.db")
                shutil.copy2(db_path, backup_file)
                backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.db')])
                for old in backups[:-30]:
                    os.remove(os.path.join(BACKUP_DIR, old))
        else:
            import subprocess
            from urllib.parse import urlparse
            parsed = urlparse(DATABASE_URL)
            backup_file = os.path.join(BACKUP_DIR, f"backup_{timestamp}.sql")
            env = os.environ.copy()
            env["PGPASSWORD"] = parsed.password or ""
            subprocess.run([
                "pg_dump", "-h", parsed.hostname or "localhost",
                "-p", str(parsed.port or 5432), "-U", parsed.username or "postgres",
                "-d", parsed.path.lstrip("/") or "visa_ticket_system", "-f", backup_file,
            ], env=env, check=True)
            backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.sql')])
            for old in backups[:-30]:
                os.remove(os.path.join(BACKUP_DIR, old))
    except Exception as e:
        logger.error(f"Backup error: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(automated_backup, 'interval', hours=6)
scheduler.start()


@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@app.post("/api/auth/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh
    )


@app.get("/api/auth/me", response_model=UserOut)
def get_me(user=Depends(get_current_user)):
    return user


@app.post("/api/auth/change-password")
def change_password(req: PasswordChangeRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not verify_password(req.current_password, user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user.password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ============================================================
# SERVE FRONTEND STATIC FILES
# ============================================================

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

if getattr(sys, 'frozen', False):
    FRONTEND_DIR = os.path.join(sys._MEIPASS, "static")
else:
    FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(FRONTEND_DIR):
    assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


if __name__ == "__main__":
    if not run_startup_checks():
        print("\nStartup failed. Please fix the errors above and try again.\n")
        sys.exit(1)
    import uvicorn
    print(f"\nServer running at: http://localhost:8000")
    print(f"Login: admin / admin123\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
