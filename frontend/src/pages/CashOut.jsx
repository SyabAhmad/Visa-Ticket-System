import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, Filter, X, Banknote, Download } from 'lucide-react';

const emptyForm = {
  agent_id: '', visa_id: '', ticket_id: '', name: '',
  amount: '', date: '', payment_method: 'cash', comments: '',
};

export default function CashOut() {
  const [cashouts, setCashouts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const searchTimeout = useRef(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (debouncedSearch) params.search = debouncedSearch;
    api.get('/cashouts/', { params }).then(res => setCashouts(res.data)).catch(() => toast.error('Failed to load cash out records')).finally(() => setLoading(false));
  };

  const exportCSV = () => {
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (debouncedSearch) params.search = debouncedSearch;
    api.get('/cashouts/export', { params, responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cashouts_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  useEffect(() => { api.get('/agents/').then(res => setAgents(res.data)); }, []);
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);
  useEffect(() => { load(); }, [filterAgent, debouncedSearch]);

  useEffect(() => {
    if (location.state?.editId) {
      api.get(`/cashouts/${location.state.editId}`).then(res => {
        openEdit(res.data);
      }).catch(() => {});
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (c) => {
    setForm({
      agent_id: c.agent_id || '', visa_id: c.visa_id || '', ticket_id: c.ticket_id || '',
      name: c.name, amount: c.amount, date: c.date,
      payment_method: c.payment_method, comments: c.comments,
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      agent_id: form.agent_id ? Number(form.agent_id) : null,
      visa_id: form.visa_id ? Number(form.visa_id) : null,
      ticket_id: form.ticket_id ? Number(form.ticket_id) : null,
      amount: Number(form.amount) || 0,
    };
    try {
      if (editingId) { await api.put(`/cashouts/${editingId}`, data); toast.success('Updated'); }
      else { await api.post('/cashouts/', data); toast.success('Created'); }
      setModalOpen(false);
      load();
    } catch (err) { toast.error('Error saving'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    try {
      await api.delete(`/cashouts/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error('Error deleting cash out record');
    }
  };

  const totalCash = cashouts.filter(c => c.payment_method === 'cash').reduce((s, c) => s + c.amount, 0);
  const totalBank = cashouts.filter(c => c.payment_method === 'online_bank').reduce((s, c) => s + c.amount, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-normal text-foreground">Cash Out</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{cashouts.length} record{cashouts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={18} /> New Cash Out
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="card p-5 card-hover">
          <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">Total Cash Out</p>
          <p className="text-[24px] font-normal text-foreground mt-1">PKR {(totalCash + totalBank).toLocaleString()}</p>
        </div>
        <div className="card p-5 card-hover">
          <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">Cash Payments</p>
          <p className="text-[24px] font-normal text-warning mt-1">PKR {totalCash.toLocaleString()}</p>
        </div>
        <div className="card p-5 card-hover">
          <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">Bank Transfers</p>
          <p className="text-[24px] font-normal text-danger mt-1">PKR {totalBank.toLocaleString()}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card mb-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Search size={18} className="text-muted-foreground" />
            <input type="text" placeholder="Search cash out..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground" />
            {search && <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-accent"><X size={16} className="text-muted-foreground" /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors ${showFilters ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`}>
            <Filter size={16} /><span>Filter</span>
          </button>
        </div>
        {showFilters && (
          <div className="px-4 pb-3 flex items-center gap-3 border-t border-border pt-3">
            <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="select">
              <option value="">All Agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {filterAgent && <button onClick={() => setFilterAgent('')} className="flex items-center gap-1 text-[13px] text-primary hover:underline"><X size={14} /> Clear</button>}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Agent', 'Amount', 'Date', 'Method', 'Comments', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></td></tr>
              ) : cashouts.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <Banknote size={48} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-[14px] text-muted-foreground">No cash out records</p>
                </td></tr>
              ) : cashouts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 table-row cursor-pointer" onClick={() => navigate(`/cashout/${c.id}`)}>
                  <td className="px-5 py-3 text-[13px] font-medium text-foreground">{c.name}</td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground">{c.agent_name || '—'}</td>
                  <td className="px-5 py-3 text-[13px] text-foreground">PKR {c.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground">{c.date}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${c.payment_method === 'cash' ? 'bg-warning-light text-warning' : 'bg-danger-light text-danger'}`}>
                      {c.payment_method === 'cash' ? 'Cash' : 'Bank'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground max-w-[180px] truncate">{c.comments || '—'}</td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-full hover:bg-accent"><Edit2 size={16} className="text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-full hover:bg-danger-light"><Trash2 size={16} className="text-danger" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Cash Out' : 'New Cash Out'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="input" />
            </div>
            <div>
              <label className="label">Agent</label>
              <select value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})} className="select">
                <option value="">None</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="select">
                <option value="cash">Cash</option>
                <option value="online_bank">Online Bank</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Comments</label>
            <textarea value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} rows={3} className="input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
