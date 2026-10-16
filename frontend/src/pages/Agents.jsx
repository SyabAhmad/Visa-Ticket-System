import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Users, CheckCircle, XCircle, Search, Download, Filter, X } from 'lucide-react';

const emptyForm = { name: '', phone: '', email: '', commission_rate: 10, status: 'active' };

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/agents/');
      setAgents(res.data);
    } catch (err) {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (location.state?.editId) {
      api.get(`/agents/${location.state.editId}`).then(res => {
        openEdit(res.data);
      }).catch(() => {});
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (a) => {
    setForm({ name: a.name, phone: a.phone || '', email: a.email || '', commission_rate: a.commission_rate, status: a.status });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, commission_rate: Number(form.commission_rate) || 10 };
    try {
      if (editingId) { await api.put(`/agents/${editingId}`, data); toast.success('Agent updated'); }
      else { await api.post('/agents/', data); toast.success('Agent created'); }
      setModalOpen(false);
      load();
    } catch (err) { toast.error('Error saving agent'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this agent and all their records?')) return;
    try {
      await api.delete(`/agents/${id}`);
      toast.success('Agent deleted');
      load();
    } catch (err) {
      toast.error('Error deleting agent');
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Phone', 'Email', 'Commission Rate', 'Status'],
      ...filteredAgents.map(a => [a.name, a.phone || '', a.email || '', a.commission_rate, a.status]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agents_export.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = !debouncedSearch || [agent.name, agent.phone, agent.email].join(' ').toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = !statusFilter || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeFilters = [statusFilter].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-primary">Agents</h1>
          <p className="text-[13px] text-secondary mt-0.5">{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={18} /> Add Agent
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card mb-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Search size={18} className="text-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents..." className="w-full bg-transparent outline-none text-[13px] text-primary placeholder:text-tertiary" />
            {search && <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-hover"><X size={16} className="text-tertiary" /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors relative ${showFilters ? 'bg-hover text-primary' : 'text-secondary hover:bg-muted'}`}>
            <Filter size={16} /><span>Filter</span>
            {activeFilters > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full text-[10px] flex items-center justify-center">{activeFilters}</span>}
          </button>
        </div>
        {showFilters && (
          <div className="px-4 pb-3 flex items-center gap-3 border-t border-border pt-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select w-auto">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {statusFilter && <button onClick={() => setStatusFilter('')} className="flex items-center gap-1 text-[13px] text-primary hover:underline"><X size={14} /> Clear</button>}
          </div>
        )}
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            {[1,2,3].map(i => (
              <div key={i} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="skeleton w-12 h-12 rounded-full"></div>
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 mb-2"></div>
                    <div className="skeleton h-3 w-16"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-3 w-24"></div>
                  <div className="skeleton h-3 w-32"></div>
                </div>
              </div>
            ))}
          </>
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full card px-5 py-16 text-center">
            <Users size={48} className="mx-auto text-tertiary mb-3" />
            <p className="text-[14px] text-secondary">No agents found</p>
            <p className="text-[12px] text-tertiary mt-1">Try a different search or add your first agent</p>
          </div>
        ) : filteredAgents.map((a) => (
          <div key={a.id} className="card card-hover overflow-hidden cursor-pointer group" onClick={() => navigate(`/agents/${a.id}`)}>
            <div className={`h-1.5 ${a.status === 'active' ? 'bg-gradient-to-r from-primary to-primary-hover' : 'bg-tertiary'}`}></div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {a.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-medium text-primary group-hover:text-primary transition-colors truncate">{a.name}</h3>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      a.status === 'active' ? 'text-success' : 'text-danger'
                    }`}>
                      {a.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {a.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-hover"><Edit2 size={16} className="text-secondary" /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-danger-light"><Trash2 size={16} className="text-danger" /></button>
                </div>
              </div>
              <div className="space-y-2 text-[13px]">
                {a.phone && <p className="text-secondary">{a.phone}</p>}
                {a.email && <p className="text-secondary">{a.email}</p>}
                <p className="text-primary font-medium">Commission: {a.commission_rate}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Agent' : 'New Agent'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="input" placeholder="Agent name" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" placeholder="Phone number" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" placeholder="Email address" />
            </div>
            <div>
              <label className="label">Commission Rate (%)</label>
              <input type="number" step="0.1" value={form.commission_rate} onChange={e => setForm({...form, commission_rate: e.target.value})} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
