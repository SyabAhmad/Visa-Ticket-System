import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Search, Filter, X, Receipt, Download,
  Wallet, Building2, AlertTriangle, ChevronDown,
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

const emptyForm = {
  title: '',
  category: 'other',
  amount: '',
  date: '',
  payment_method: 'cash',
  payment_remarks: '',
  notes: '',
};

function SectionHeader({ icon: Icon, title, variant = 'primary' }) {
  const variants = {
    primary: 'bg-icon-primary text-primary',
    info: 'bg-icon-info text-info',
    warning: 'bg-icon-warning text-warning',
    success: 'bg-icon-success text-success',
  };
  return (
    <div className="flex items-center gap-2.5 pt-5 pb-3 border-b border-border">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${variants[variant]}`}>
        <Icon size={14} />
      </div>
      <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, cash_total: 0, bank_total: 0, count: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  const load = () => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterCategory) params.category = filterCategory;
    if (filterMethod) params.payment_method = filterMethod;
    Promise.allSettled([
      api.get('/expenses/', { params }),
      api.get('/expenses/summary'),
    ]).then(([listRes, sumRes]) => {
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data;
        setExpenses(Array.isArray(data) ? data : []);
      }
      if (sumRes.status === 'fulfilled') {
        const data = sumRes.value.data;
        setSummary(data && typeof data === 'object' ? data : { total: 0, cash_total: 0, bank_total: 0, count: 0 });
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [debouncedSearch, filterCategory, filterMethod]);

  useEffect(() => {
    if (location.state?.editId) {
      api.get(`/expenses/${location.state.editId}`).then(res => {
        openEdit(res.data);
      }).catch(() => {});
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (e) => {
    setForm({
      title: e.title || '',
      category: e.category || 'other',
      amount: e.amount || '',
      date: e.date || '',
      payment_method: e.payment_method || 'cash',
      payment_remarks: e.payment_remarks || '',
      notes: e.notes || '',
    });
    setEditingId(e.id);
    setModalOpen(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const data = {
      ...form,
      amount: Number(form.amount) || 0,
    };
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, data);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses/', data);
        toast.success('Expense created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving expense');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      setDeleteConfirm(null);
      load();
    } catch {
      toast.error('Error deleting expense');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Remarks', 'Notes'];
    const rows = expenses.map(e => [e.date, e.title, categoryLabel(e.category), e.amount, e.payment_method, e.payment_remarks, e.notes]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  const formatCurrency = (val) =>
    `PKR ${(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const inputCls = 'input';
  const selectCls = 'select';

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-normal text-foreground">Expenses</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {summary.count} expense{summary.count !== 1 ? 's' : ''} — {formatCurrency(summary.total)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={18} /> New Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="card p-5 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-icon-primary flex items-center justify-center">
              <Receipt size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Expenses</p>
              <p className="text-[18px] font-semibold text-foreground mt-0.5">{formatCurrency(summary.total)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-icon-warning flex items-center justify-center">
              <Wallet size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Cash Payments</p>
              <p className="text-[18px] font-semibold text-warning mt-0.5">{formatCurrency(summary.cash_total)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-icon-info flex items-center justify-center">
              <Building2 size={20} className="text-info" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Bank Payments</p>
              <p className="text-[18px] font-semibold text-info mt-0.5">{formatCurrency(summary.bank_total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card mb-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Search size={18} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search expenses by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-hover">
                <X size={16} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
              showFilters || filterCategory || filterMethod
                ? 'bg-active text-primary' : 'text-muted-foreground hover:bg-hover'
            }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
            {(filterCategory || filterMethod) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        </div>
        {showFilters && (
          <div className="px-4 pb-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wider">Category</span>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="select px-3 py-1.5 text-[13px]">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wider">Payment</span>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                {['all', 'cash', 'bank'].map(m => (
                  <button
                    key={m}
                    onClick={() => setFilterMethod(m === 'all' ? '' : m)}
                    className={`px-3 py-1 rounded-md text-[12px] font-medium capitalize transition-colors ${
                      (m === 'all' && !filterMethod) || filterMethod === m
                        ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {(filterCategory || filterMethod) && (
              <button onClick={() => { setFilterCategory(''); setFilterMethod(''); }} className="flex items-center gap-1 text-[12px] text-primary hover:underline">
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-4 bg-muted rounded w-16 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  {['Date', 'Expense', 'Category', 'Amount', 'Method', 'Remarks', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Receipt size={32} className="text-tertiary" />
                        </div>
                        <p className="text-[14px] font-medium text-foreground mb-1">No expenses found</p>
                        <p className="text-[12px] text-muted-foreground">
                          {search || filterCategory || filterMethod
                            ? 'Try adjusting your search or filters'
                            : 'Record your first expense to get started'}
                        </p>
                        {!search && !filterCategory && !filterMethod && (
                          <button onClick={openAdd} className="mt-4 btn btn-primary">
                            <Plus size={16} /> New Expense
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border last:border-0 table-row cursor-pointer"
                    onClick={() => navigate(`/expenses/${e.id}`)}
                  >
                    <td className="px-5 py-3 text-[13px] text-muted-foreground whitespace-nowrap">{e.date || '—'}</td>
                    <td className="px-5 py-3 text-[13px] font-medium text-foreground">{e.title}</td>
                    <td className="px-5 py-3">
                      <span className="badge bg-muted text-muted-foreground">{categoryLabel(e.category)}</span>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium text-foreground whitespace-nowrap">{formatCurrency(e.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${e.payment_method === 'cash' ? 'bg-warning-light text-warning' : 'bg-info-light text-info'}`}>
                        {e.payment_method === 'cash' ? 'Cash' : 'Bank'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-muted-foreground max-w-[200px] truncate">{e.payment_remarks || '—'}</td>
                    <td className="px-5 py-3" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-full hover:bg-hover transition-colors" title="Edit">
                          <Edit2 size={16} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteConfirm(e.id)} className="p-1.5 rounded-full hover:bg-danger-light transition-colors" title="Delete">
                          <Trash2 size={16} className="text-danger" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Expense' : 'New Expense'}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Expense Information */}
          <SectionHeader icon={Receipt} title="Expense Information" variant="primary" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Expense Title <span className="text-danger">*</span></label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                placeholder="e.g. Office Rent"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={selectCls}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label">Expense Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Payment Information */}
          <SectionHeader icon={Wallet} title="Payment Information" variant="warning" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Amount <span className="text-danger">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <div className="relative">
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className={selectCls}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="sm:col-span-1">
              <label className="label">Payment Remarks</label>
              <input
                type="text"
                value={form.payment_remarks}
                onChange={(e) => setForm({ ...form, payment_remarks: e.target.value })}
                className={inputCls}
                placeholder="e.g. Paid electricity bill"
              />
            </div>
          </div>

          {/* Additional Information */}
          <SectionHeader icon={AlertTriangle} title="Additional Information" variant="info" />
          <div>
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="input resize-none"
              placeholder="Optional notes about this expense..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Expense' : 'Create Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Expense"
      >
        <div className="text-center py-2">
          <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-danger" />
          </div>
          <p className="text-[14px] text-foreground mb-1">Are you sure you want to delete this expense?</p>
          <p className="text-[12px] text-muted-foreground">This action cannot be undone.</p>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">Cancel</button>
          <button onClick={() => handleDelete(deleteConfirm)} className="btn px-5 py-2.5 bg-danger text-white rounded-full text-[13px] font-medium hover:opacity-90 transition-all">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

