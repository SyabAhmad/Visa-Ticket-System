from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Expense
from schemas import ExpenseCreate, ExpenseUpdate, ExpenseOut
from auth import get_current_user
from routers.activity import log_activity
from typing import Optional

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

EXPENSE_CATEGORIES = [
    "office_rent", "utilities", "internet", "electricity", "water",
    "salaries", "transportation", "office_supplies", "maintenance",
    "marketing", "food", "travel", "other",
]


@router.get("/categories")
def get_categories(user=Depends(get_current_user)):
    return EXPENSE_CATEGORIES


@router.get("/", response_model=list[ExpenseOut])
def list_expenses(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(Expense)
    if search:
        query = query.filter(Expense.title.ilike(f"%{search}%"))
    if category:
        query = query.filter(Expense.category == category)
    if payment_method:
        query = query.filter(Expense.payment_method == payment_method)
    expenses = query.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
    return [ExpenseOut.model_validate(e) for e in expenses]


@router.post("/", response_model=ExpenseOut)
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_expense = Expense(**expense.model_dump())
    db.add(db_expense)
    db.flush()
    log_activity(db, user, "create", "expense", db_expense.id, f"Title: {db_expense.title}, Amount: PKR {db_expense.amount}")
    db.commit()
    db.refresh(db_expense)
    return ExpenseOut.model_validate(db_expense)


@router.get("/summary")
def get_expense_summary(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    expenses = db.query(Expense).all()
    total = sum(e.amount for e in expenses)
    cash_total = sum(e.amount for e in expenses if e.payment_method == "cash")
    bank_total = sum(e.amount for e in expenses if e.payment_method == "bank")
    by_category = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0) + e.amount
    return {
        "total": total,
        "cash_total": cash_total,
        "bank_total": bank_total,
        "count": len(expenses),
        "by_category": by_category,
    }


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return ExpenseOut.model_validate(expense)


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, update: ExpenseUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)
    log_activity(db, user, "update", "expense", expense.id, f"Title: {expense.title}, Amount: PKR {expense.amount}")
    db.commit()
    db.refresh(expense)
    return ExpenseOut.model_validate(expense)


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    title = expense.title
    amount = expense.amount
    db.delete(expense)
    log_activity(db, user, "delete", "expense", expense_id, f"Title: {title}, Amount: PKR {amount}")
    db.commit()
    return {"detail": "Expense deleted"}
