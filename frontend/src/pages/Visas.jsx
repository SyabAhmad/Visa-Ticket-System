import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Search, Filter, X, Stamp, Download,
  User, CreditCard, FileText, Calculator,
} from 'lucide-react';

const emptyForm = {
  agent_id: '', passenger_name: '', contact_number: '', passport_number: '',
  dob: '', passport_expiry: '', occupation: '',
  visa_type: 'umrah', visa_number: '', sponsor_number: '',
  visa_process_charges: '', medical_token_charges: '',
  agreement_paper_charges: '', extra_charges: '',
  received: '', purchase_rate: '', agent_commission_percentage: '',
  payment_method: 'cash', payment_remarks: '', status: 'pending',
};

const statusOptions = [
  { value: 'pending', label: 'Pending', dot: 'bg-warning' },
  { value: 'approved', label: 'Approved', dot: 'bg-success' },
  { value: 'rejected', label: 'Rejected', dot: 'bg-danger' },
];

const statusBadgeClass = {
  pending: 'bg-warning-light text-warning',
  approved: 'bg-success-light text-success',
  rejected: 'bg-danger-light text-danger',
};

const paymentStatusBadge = (total, received) => {
  const d = total - received;
  if (d <= 0) return { text: 'Paid', cls: 'bg-success-light text-success' };
  if (received > 0) return { text: 'Partial', cls: 'bg-warning-light text-warning' };
  return { text: 'Unpaid', cls: 'bg-danger-light text-danger' };
};

function calcPreview(form) {
  const vp = Number(form.visa_process_charges) || 0;
  const mt = Number(form.medical_token_charges) || 0;
  const ap = Number(form.agreement_paper_charges) || 0;
  const ec = Number(form.extra_charges) || 0;
  const total = vp + mt + ap + ec;
  const received = Number(form.received) || 0;
  const purchase = Number(form.purchase_rate) || 0;
  const commission = total - purchase;
  const commissionPct = total > 0 ? ((commission / total) * 100).toFixed(1) : '0.0';
  return { total, commission, commissionPct };
}

function SectionHeader({ icon: Icon, title, color }) {
  return (
    <div className="section-header mb-4 mt-1">
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${color}`}>
        <Icon size={15} className="text-white" />
      </div>
      <h3 className="text-[12px] font-semibold text-primary uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function SkeletonRows({ rows = 8 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 11 }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="skeleton h-4 rounded" style={{ width: j === 0 ? '60%' : j === 7 ? '70%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function Visas() {
  const [visas, setVisas] = useState([]);
  const [agents, setAgents] = useState([]);
  const [visaTypes, setVisaTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const searchTimeout = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (filterStatus) params.status = filterStatus;
    if (debouncedSearch) params.search = debouncedSearch;
    api.get('/visas/', { params })
      .then(res => setVisas(res.data))
      .catch(() => toast.error('Failed to load visas'))
      .finally(() => setLoading(false));
  }, [filterAgent, filterStatus, debouncedSearch]);

  useEffect(() => {
    api.get('/agents/').then(res => setAgents(res.data));
    api.get('/settings/visa_types').then(res => setVisaTypes(res.data.value.split(','))).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  useEffect(() => {
    if (location.state?.editId) {
      api.get(`/visas/${location.state.editId}`).then(res => openEdit(res.data)).catch(() => {});
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const exportCSV = () => {
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (filterStatus) params.status = filterStatus;
    if (debouncedSearch) params.search = debouncedSearch;
    api.get('/visas/export', { params, responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'visas_export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Export failed'));
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (v) => {
    setForm({
      agent_id: v.agent_id || '', passenger_name: v.passenger_name || '',
      contact_number: v.contact_number || '', passport_number: v.passport_number || '',
      dob: v.dob || '', passport_expiry: v.passport_expiry || '',
      occupation: v.occupation || '', visa_type: v.visa_type || 'umrah',
      visa_number: v.visa_number || '', sponsor_number: v.sponsor_number || '',
      visa_process_charges: v.visa_process_charges || '',
      medical_token_charges: v.medical_token_charges || '',
      agreement_paper_charges: v.agreement_paper_charges || '',
      extra_charges: v.extra_charges || '', received: v.received || '',
      purchase_rate: v.purchase_rate || '',
      agent_commission_percentage: v.agent_commission_percentage || '',
      payment_method: v.payment_method || 'cash',
      payment_remarks: v.payment_remarks || '', status: v.status || 'pending',
    });
    setEditingId(v.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      agent_id: Number(form.agent_id),
      passenger_name: form.passenger_name,
      contact_number: form.contact_number,
      passport_number: form.passport_number,
      dob: form.dob,
      passport_expiry: form.passport_expiry,
      occupation: form.occupation,
      visa_type: form.visa_type,
      visa_number: form.visa_number,
      sponsor_number: form.sponsor_number,
      visa_process_charges: Number(form.visa_process_charges) || 0,
      medical_token_charges: Number(form.medical_token_charges) || 0,
      agreement_paper_charges: Number(form.agreement_paper_charges) || 0,
      extra_charges: Number(form.extra_charges) || 0,
      received: Number(form.received) || 0,
      purchase_rate: Number(form.purchase_rate) || 0,
      agent_commission_percentage: Number(form.agent_commission_percentage) || 0,
      payment_method: form.payment_method,
      payment_remarks: form.payment_remarks,
      status: form.status,
    };
    try {
      if (editingId) {
        await api.put(`/visas/${editingId}`, data);
        toast.success('Visa updated');
      } else {
        await api.post('/visas/', data);
        toast.success('Visa created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving visa');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/visas/${id}`);
      toast.success('Visa deleted');
      setDeleteConfirm(null);
      load();
    } catch {
      toast.error('Error deleting visa');
    }
  };

  const preview = useMemo(() => calcPreview(form), [form]);

  const formatCurrency = (v) => `PKR ${(v || 0).toLocaleString()}`;

  const filteredVisas = useMemo(() => {
    if (!filterPayment) return visas;
    return visas.filter(v => {
      const ps = paymentStatusBadge(v.total_charges, v.received);
      return ps.text.toLowerCase() === filterPayment;
    });
  }, [visas, filterPayment]);

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-primary flex items-center gap-2">
            <Stamp size={24} className="text-primary" />
            Visa Processing
          </h1>
          <p className="text-[13px] text-secondary mt-1">
            {filteredVisas.length} record{filteredVisas.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={18} /> New Visa
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Search size={18} className="text-secondary" />
            <input
              type="text"
              placeholder="Search by name, passport, visa number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none text-[13px] text-primary placeholder:text-tertiary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-hover">
                <X size={16} className="text-secondary" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-colors ${
              showFilters || filterAgent || filterStatus || filterPayment
                ? 'bg-danger-light text-primary'
                : 'text-secondary hover:bg-muted'
            }`}
          >
            <Filter size={16} />
            <span>Filters</span>
            {(filterAgent || filterStatus || filterPayment) && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">
                {[filterAgent, filterStatus, filterPayment].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-secondary uppercase tracking-wider">Agent</span>
                <select
                  value={filterAgent}
                  onChange={e => setFilterAgent(e.target.value)}
                  className="select text-[13px] w-auto min-w-[160px]"
                >
                  <option value="">All Agents</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-secondary uppercase tracking-wider">Visa Status</span>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="select text-[13px] w-auto min-w-[140px]"
                >
                  <option value="">All Status</option>
                  {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-secondary uppercase tracking-wider">Payment</span>
                <select
                  value={filterPayment}
                  onChange={e => setFilterPayment(e.target.value)}
                  className="select text-[13px] w-auto min-w-[140px]"
                >
                  <option value="">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              {(filterAgent || filterStatus || filterPayment) && (
                <button
                  onClick={() => { setFilterAgent(''); setFilterStatus(''); setFilterPayment(''); }}
                  className="flex items-center gap-1 text-[13px] text-primary font-medium hover:underline"
                >
                  <X size={14} /> Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {['Passenger', 'Agent', 'Visa Type', 'Visa No', 'Total Charges', 'Received', 'Purchase Rate', 'Commission', 'Payment Status', 'Visa Status', ''].map(h => (
                    <th key={h || 'act'} className="text-left px-4 py-3 text-[11px] font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <SkeletonRows />
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {['Passenger', 'Agent', 'Visa Type', 'Visa No', 'Total Charges', 'Received', 'Purchase Rate', 'Commission', 'Payment Status', 'Visa Status', ''].map(h => (
                    <th key={h || 'act'} className="text-left px-4 py-3 text-[11px] font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVisas.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Stamp size={28} className="text-tertiary" />
                        </div>
                        <p className="text-[14px] font-medium text-primary mb-1">No visa records found</p>
                        <p className="text-[13px] text-secondary mb-4">
                          {search || filterAgent || filterStatus || filterPayment
                            ? 'Try adjusting your search or filters'
                            : 'Create your first visa record to get started'}
                        </p>
                        {!search && !filterAgent && !filterStatus && !filterPayment && (
                          <button onClick={openAdd} className="btn btn-primary">
                            <Plus size={16} /> New Visa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVisas.map(v => {
                    const ps = paymentStatusBadge(v.total_charges, v.received);
                    return (
                      <tr
                        key={v.id}
                        className="border-b border-border last:border-0 table-row cursor-pointer transition-colors"
                        onClick={() => navigate(`/visas/${v.id}`)}
                      >
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] font-medium text-primary">{v.passenger_name}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-secondary">{v.agent_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-secondary capitalize">{v.visa_type}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-secondary font-mono">{v.visa_number || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] font-semibold text-primary">{formatCurrency(v.total_charges)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-success font-medium">{formatCurrency(v.received)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-secondary">{formatCurrency(v.purchase_rate)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[13px] font-medium ${(v.commission || 0) > 0 ? 'text-success' : 'text-secondary'}`}>
                            {formatCurrency(v.commission)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`badge ${ps.cls}`}>{ps.text}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`badge ${statusBadgeClass[v.status] || statusBadgeClass.pending}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusOptions.find(s => s.value === v.status)?.dot || 'bg-warning'}`} />
                            {v.status}
                          </span>
                        </td>
                        <td className="px-2 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(v)}
                              className="p-1.5 rounded-lg hover:bg-hover transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={15} className="text-secondary" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(v.id)}
                              className="p-1.5 rounded-lg hover:bg-danger-light transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} className="text-danger" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Visa Record' : 'New Visa Record'} wide>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Personal Info */}
          <div>
            <SectionHeader icon={User} title="Personal Information" color="bg-info" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Passenger Name" required>
                <input
                  className="input" placeholder="Full name"
                  value={form.passenger_name} onChange={e => setForm({...form, passenger_name: e.target.value})}
                />
              </FormField>
              <FormField label="Passport Number">
                <input
                  className="input" placeholder="Passport number"
                  value={form.passport_number} onChange={e => setForm({...form, passport_number: e.target.value})}
                />
              </FormField>
              <FormField label="Contact Number">
                <input
                  className="input" placeholder="Phone number"
                  value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <FormField label="Date of Birth">
                <input
                  type="date" className="input"
                  value={form.dob} onChange={e => setForm({...form, dob: e.target.value})}
                />
              </FormField>
              <FormField label="Passport Expiry">
                <input
                  type="date" className="input"
                  value={form.passport_expiry} onChange={e => setForm({...form, passport_expiry: e.target.value})}
                />
              </FormField>
              <FormField label="Occupation">
                <input
                  className="input" placeholder="Occupation"
                  value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})}
                />
              </FormField>
            </div>
          </div>

          {/* Section 2: Visa Info */}
          <div>
            <SectionHeader icon={FileText} title="Visa Information" color="bg-primary" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Visa Type" required>
                <select
                  className="select" value={form.visa_type}
                  onChange={e => setForm({...form, visa_type: e.target.value})}
                >
                  {visaTypes.map(v => <option key={v} value={v.trim()}>{v.trim()}</option>)}
                </select>
              </FormField>
              <FormField label="Visa Number">
                <input
                  className="input" placeholder="Visa number"
                  value={form.visa_number} onChange={e => setForm({...form, visa_number: e.target.value})}
                />
              </FormField>
              <FormField label="Sponsor Number">
                <input
                  className="input" placeholder="Sponsor number"
                  value={form.sponsor_number} onChange={e => setForm({...form, sponsor_number: e.target.value})}
                />
              </FormField>
            </div>
          </div>

          {/* Section 3: Agent & Charges */}
          <div>
            <SectionHeader icon={CreditCard} title="Agent & Charges" color="bg-warning" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Agent" required>
                <select
                  className="select" value={form.agent_id}
                  onChange={e => setForm({...form, agent_id: e.target.value})}
                >
                  <option value="">Select Agent</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  className="select" value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                >
                  {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormField>
              <FormField label="Payment Method">
                <select
                  className="select" value={form.payment_method}
                  onChange={e => setForm({...form, payment_method: e.target.value})}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online</option>
                  <option value="cheque">Cheque</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FormField label="Visa Process Charges">
                <input
                  type="number" step="0.01" min="0" className="input" placeholder="0"
                  value={form.visa_process_charges}
                  onChange={e => setForm({...form, visa_process_charges: e.target.value})}
                />
              </FormField>
              <FormField label="Medical Token Charges">
                <input
                  type="number" step="0.01" min="0" className="input" placeholder="0"
                  value={form.medical_token_charges}
                  onChange={e => setForm({...form, medical_token_charges: e.target.value})}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FormField label="Agreement Paper Charges">
                <input
                  type="number" step="0.01" min="0" className="input" placeholder="0"
                  value={form.agreement_paper_charges}
                  onChange={e => setForm({...form, agreement_paper_charges: e.target.value})}
                />
              </FormField>
              <FormField label="Extra Charges">
                <input
                  type="number" step="0.01" min="0" className="input" placeholder="0"
                  value={form.extra_charges}
                  onChange={e => setForm({...form, extra_charges: e.target.value})}
                />
              </FormField>
            </div>
          </div>

          {/* Section 4: Cost & Profit */}
          <div>
            <SectionHeader icon={Calculator} title="Cost & Profit" color="bg-success" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Total Charges">
                <input
                  readOnly className="input input-readonly font-semibold"
                  value={preview.total > 0 ? `PKR ${preview.total.toLocaleString()}` : 'PKR 0'}
                />
              </FormField>
              <FormField label="Received Amount">
                <input
                  type="number" step="0.01" min="0" className="input" placeholder="Amount received"
                  value={form.received}
                  onChange={e => setForm({...form, received: e.target.value})}
                />
              </FormField>
              <FormField label="Purchase Rate">
                <input
                  type="number" step="0.01" min="0" className="input" placeholder="Cost from supplier"
                  value={form.purchase_rate}
                  onChange={e => setForm({...form, purchase_rate: e.target.value})}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FormField label="Agent Commission %">
                <input
                  type="number" step="0.1" min="0" max="100" className="input" placeholder="0"
                  value={form.agent_commission_percentage}
                  onChange={e => setForm({...form, agent_commission_percentage: e.target.value})}
                />
              </FormField>
              <FormField label="Commission (Auto-calculated)">
                <input
                  readOnly className="input input-readonly font-semibold"
                  value={preview.total > 0 ? `PKR ${preview.commission.toLocaleString()}` : 'PKR 0'}
                />
              </FormField>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className={`rounded-lg p-4 ${preview.total - (Number(form.received) || 0) > 0 ? 'bg-warning-light' : 'bg-success-light'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium text-secondary uppercase tracking-wider">Dues</span>
                  <span className={`text-[16px] font-semibold ${preview.total - (Number(form.received) || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                    {formatCurrency(preview.total - (Number(form.received) || 0))}
                  </span>
                </div>
              </div>
              <div className="rounded-lg p-4 bg-success-light">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium text-secondary uppercase tracking-wider">Commission</span>
                  <span className="text-[16px] font-semibold text-success">
                    {formatCurrency(preview.commission)}
                    {preview.total > 0 && (
                      <span className="text-[11px] ml-1 font-normal">({preview.commissionPct}%)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <FormField label="Payment Remarks">
              <textarea
                className="input min-h-[60px] resize-none" placeholder="Optional payment notes"
                value={form.payment_remarks} onChange={e => setForm({...form, payment_remarks: e.target.value})}
              />
            </FormField>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Visa' : 'Create Visa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Visa Record">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-danger-light">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-danger flex items-center justify-center">
              <Trash2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-primary">Are you sure?</p>
              <p className="text-[13px] text-secondary mt-0.5">
                This visa record will be permanently deleted. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger">
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
