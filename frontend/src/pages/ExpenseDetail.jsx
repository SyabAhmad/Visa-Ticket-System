import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Edit2, Trash2, Receipt, Calendar, Wallet,
  FileText, MessageSquare, Building2, AlertTriangle,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'office_rent', label: 'Office Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'internet', label: 'Internet' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'food', label: 'Food' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

const categoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val;

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get(`/expenses/${id}`)
      .then(res => { if (active) setExpense(res.data); })
      .catch(() => { if (active) { toast.error('Expense not found'); navigate('/expenses'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      navigate('/expenses');
    } catch {
      toast.error('Error deleting expense');
    }
  };

  const formatCurrency = (val) =>
    `PKR ${(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
  if (!expense) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/expenses')} className="p-2 rounded-lg hover:bg-hover transition-colors">
          <ArrowLeft size={20} className="text-secondary" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-foreground">Expense Details</h1>
          <p className="text-[13px] text-secondary mt-0.5">{expense.title}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => navigate('/expenses', { state: { editId: expense.id } })} className="btn btn-secondary">
            <Edit2 size={16} /> Edit
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Amount Card */}
        <div className={`rounded-xl p-6 flex items-center gap-5 ${
          expense.payment_method === 'cash' ? 'bg-warning-light' : 'bg-info-light'
        }`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            expense.payment_method === 'cash' ? 'bg-warning' : 'bg-info'
          }`}>
            {expense.payment_method === 'cash'
              ? <Wallet size={28} className="text-white" />
              : <Building2 size={28} className="text-white" />
            }
          </div>
          <div>
            <p className="text-[12px] text-secondary uppercase tracking-wider">Amount</p>
            <p className="text-[32px] font-normal text-foreground">{formatCurrency(expense.amount)}</p>
          </div>
        </div>

        {/* Details Card */}
        <div className="card p-6">
          <h3 className="text-[13px] font-medium text-secondary uppercase tracking-wider mb-4">Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Receipt size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Title</p>
                <p className="text-[14px] text-foreground mt-0.5">{expense.title}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Category</p>
                <p className="text-[14px] text-foreground mt-0.5">{categoryLabel(expense.category)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Date</p>
                <p className="text-[14px] text-foreground mt-0.5">{expense.date || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Wallet size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Payment Method</p>
                <p className="text-[14px] text-foreground mt-0.5 capitalize">{expense.payment_method === 'bank' ? 'Bank Transfer' : 'Cash'}</p>
              </div>
            </div>
            {expense.payment_remarks && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={18} className="text-secondary" />
                </div>
                <div>
                  <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Payment Remarks</p>
                  <p className="text-[14px] text-foreground mt-0.5">{expense.payment_remarks}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="card p-6">
            <h3 className="text-[13px] font-medium text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <MessageSquare size={16} /> Notes
            </h3>
            <p className="text-[13px] text-foreground bg-muted rounded-lg p-4 whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}

        {/* Created At */}
        <div className="card p-4">
          <p className="text-[11px] text-tertiary">
            Created: {expense.created_at ? new Date(expense.created_at).toLocaleString() : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
