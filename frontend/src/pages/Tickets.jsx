import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Filter,
  X,
  Ticket,
  Users,
  Plane,
  CreditCard,
  BarChart3,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

const emptyForm = {
  agent_id: '',
  pnr_number: '',
  passenger_name: '',
  contact_number: '',
  dob: '',
  passport_number: '',
  passport_expiry: '',
  sector: '',
  airline: '',
  trip_type: 'one_way',
  departure_date: '',
  return_date: '',
  total_payment: '',
  received_payment: '',
  payment_method: 'cash',
  payment_remarks: '',
  purchase_rate: '',
  agent_commission_percentage: '',
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

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAgent, setFilterAgent] = useState('');
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

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterStatus !== 'all') params.payment_status = filterStatus;
    api
      .get('/tickets/', { params })
      .then((res) => setTickets(res.data))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [filterAgent, debouncedSearch, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get('/agents/')
      .then((res) => setAgents(res.data))
      .catch(() => {});
    api
      .get('/settings/airlines')
      .then((res) => setAirlines(res.data.value.split(',')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (location.state?.editId) {
      const editId = location.state.editId;
      api
        .get(`/tickets/${editId}`)
        .then((res) => openEdit(res.data))
        .catch(() => {});
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const getSelectedAgent = () =>
    agents.find((a) => a.id === Number(form.agent_id));

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setForm({
      agent_id: t.agent_id || '',
      pnr_number: t.pnr_number || '',
      passenger_name: t.passenger_name || '',
      contact_number: t.contact_number || '',
      dob: t.dob || '',
      passport_number: t.passport_number || '',
      passport_expiry: t.passport_expiry || '',
      sector: t.sector || '',
      airline: t.airline || '',
      trip_type: t.trip_type || 'one_way',
      departure_date: t.departure_date || '',
      return_date: t.return_date || '',
      total_payment: t.total_payment || '',
      received_payment: t.received_payment || '',
      payment_method: t.payment_method || 'cash',
      payment_remarks: t.payment_remarks || '',
      purchase_rate: t.purchase_rate || '',
      agent_commission_percentage: t.agent_commission_percentage || '',
    });
    setEditingId(t.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      agent_id: Number(form.agent_id),
      pnr_number: form.pnr_number,
      passenger_name: form.passenger_name,
      contact_number: form.contact_number,
      dob: form.dob,
      passport_number: form.passport_number,
      passport_expiry: form.passport_expiry,
      sector: form.sector,
      airline: form.airline,
      trip_type: form.trip_type,
      departure_date: form.departure_date,
      return_date: form.trip_type === 'return' ? form.return_date : '',
      total_payment: Number(form.total_payment) || 0,
      received_payment: Number(form.received_payment) || 0,
      payment_method: form.payment_method,
      payment_remarks: form.payment_remarks,
      purchase_rate: Number(form.purchase_rate) || 0,
      agent_commission_percentage:
        Number(form.agent_commission_percentage) || 0,
    };
    try {
      if (editingId) {
        await api.put(`/tickets/${editingId}`, data);
        toast.success('Ticket updated');
      } else {
        await api.post('/tickets/', data);
        toast.success('Ticket created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving ticket');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tickets/${id}`);
      toast.success('Ticket deleted');
      setDeleteConfirm(null);
      load();
    } catch {
      toast.error('Error deleting ticket');
    }
  };

  const calcPreview = () => {
    const total = Number(form.total_payment) || 0;
    const received = Number(form.received_payment) || 0;
    const purchase = Number(form.purchase_rate) || 0;
    const dues = total - received;
    const profit = total - purchase;
    const pct = Number(form.agent_commission_percentage) || 0;
    const agentComm = profit * pct / 100;
    return { dues, profit, agentComm, pct };
  };

  const preview = calcPreview();

  const exportCSV = () => {
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterStatus !== 'all') params.payment_status = filterStatus;
    api
      .get('/tickets/export', { params, responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tickets_export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Export downloaded');
      })
      .catch(() => toast.error('Export failed'));
  };

  const formatCurrency = (val) =>
    `PKR ${(Number(val) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusBadge = (status) => {
    const map = {
      paid: 'bg-success-light text-success',
      partial: 'bg-warning-light text-warning',
      pending: 'bg-danger-light text-danger',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
          map[status] || map.pending
        }`}
      >
        {status || 'pending'}
      </span>
    );
  };

  const inputCls =
    'input';
  const inputReadonly =
    'input input-readonly';
  const selectCls =
    'select';

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-normal text-primary">
            Ticket Bookings
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {tickets.length} booking{tickets.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-border text-muted-foreground px-4 py-2.5 rounded-full text-[13px] font-medium bg-card hover:bg-hover transition-all"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-[13px] font-medium hover:opacity-90 hover:shadow-sm transition-all"
          >
            <Plus size={18} /> New Booking
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-card rounded-xl border border-border mb-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Search size={18} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by passenger, PNR, agent, sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none text-[13px] text-primary placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="p-0.5 rounded-full hover:bg-hover"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
              showFilters
                ? 'bg-active text-primary'
                : 'text-muted-foreground hover:bg-hover'
            }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
            {(filterStatus !== 'all' || filterAgent) && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
        {showFilters && (
          <div className="px-4 pb-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wider">
                Status
              </span>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                {['all', 'pending', 'partial', 'paid'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium capitalize transition-colors ${
                      filterStatus === s
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wider">
                Agent
              </span>
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-[13px] focus:ring-0 outline-none bg-card text-primary"
              >
                <option value="">All Agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            {(filterStatus !== 'all' || filterAgent) && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterAgent('');
                }}
                className="flex items-center gap-1 text-[12px] text-primary hover:underline"
              >
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-border last:border-0"
              >
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-border">
                  {[
                    'Passenger',
                    'Agent',
                    'PNR',
                    'Sector',
                    'Airline',
                    'Trip',
                    'Departure',
                    'Total PKR',
                    'Received',
                    'Dues',
                    'Purchase',
                    'Profit',
                    'Commission',
                    'Status',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="px-5 py-20 text-center"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Ticket
                            size={32}
                            className="text-tertiary"
                          />
                        </div>
                        <p className="text-[14px] font-medium text-primary mb-1">
                          No bookings found
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {search || filterStatus !== 'all' || filterAgent
                            ? 'Try adjusting your search or filters'
                            : 'Create your first booking to get started'}
                        </p>
                        {!search &&
                          filterStatus === 'all' &&
                          !filterAgent && (
                            <button
                              onClick={openAdd}
                              className="mt-4 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-[13px] font-medium hover:opacity-90 transition-all"
                            >
                              <Plus size={16} /> New Booking
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border last:border-0 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td className="px-4 py-3 text-[13px] font-medium text-primary">
                        {t.passenger_name}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {t.agent_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground font-mono">
                        {t.pnr_number || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {t.sector || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {t.airline || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground capitalize">
                        {t.trip_type === 'return' ? 'Return' : 'One Way'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatDate(t.departure_date)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-primary font-medium whitespace-nowrap">
                        {formatCurrency(t.total_payment)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatCurrency(t.received_payment)}
                      </td>
                      <td className="px-4 py-3 text-[13px] whitespace-nowrap">
                        <span
                          className={
                            t.dues > 0
                              ? 'text-danger font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {t.dues > 0 ? formatCurrency(t.dues) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatCurrency(t.purchase_rate)}
                      </td>
                      <td className="px-4 py-3 text-[13px] whitespace-nowrap">
                        <span
                          className={
                            t.ticket_profit > 0
                              ? 'text-success font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {formatCurrency(t.ticket_profit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatCurrency(t.agent_commission)}
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(t.payment_status)}
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-full hover:bg-hover transition-colors"
                            title="Edit"
                          >
                            <Edit2
                              size={16}
                              className="text-muted-foreground"
                            />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(t.id)}
                            className="p-1.5 rounded-full hover:bg-danger-light transition-colors"
                            title="Delete"
                          >
                            <Trash2
                              size={16}
                              className="text-danger"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Booking' : 'New Booking'}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Passenger Info */}
           <SectionHeader icon={Users} title="Passenger Info" variant="primary" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Passenger Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={form.passenger_name}
                onChange={(e) =>
                  setForm({ ...form, passenger_name: e.target.value })
                }
                className={inputCls}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="label">
                Contact Number
              </label>
              <input
                type="text"
                value={form.contact_number}
                onChange={(e) =>
                  setForm({ ...form, contact_number: e.target.value })
                }
                className={inputCls}
                placeholder="+92..."
              />
            </div>
            <div>
              <label className="label">
                Date of Birth
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) =>
                  setForm({ ...form, dob: e.target.value })
                }
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Passport Number
              </label>
              <input
                type="text"
                value={form.passport_number}
                onChange={(e) =>
                  setForm({ ...form, passport_number: e.target.value })
                }
                className={inputCls}
                placeholder="AB1234567"
              />
            </div>
            <div>
              <label className="label">
                Passport Expiry
              </label>
              <input
                type="date"
                value={form.passport_expiry}
                onChange={(e) =>
                  setForm({ ...form, passport_expiry: e.target.value })
                }
                className={inputCls}
              />
            </div>
          </div>

          {/* Flight Info */}
           <SectionHeader icon={Plane} title="Flight Info" variant="info" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Sector
              </label>
              <input
                type="text"
                value={form.sector}
                onChange={(e) =>
                  setForm({ ...form, sector: e.target.value })
                }
                className={inputCls}
                placeholder="e.g. JED-MNL"
              />
            </div>
            <div>
              <label className="label">
                Airline
              </label>
              <div className="relative">
                <select
                  value={form.airline}
                  onChange={(e) =>
                    setForm({ ...form, airline: e.target.value })
                  }
                  className={selectCls}
                >
                  <option value="">Select Airline</option>
                  {airlines.map((a) => (
                    <option key={a} value={a.trim()}>
                      {a.trim()}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label className="label">
                PNR Number
              </label>
              <input
                type="text"
                value={form.pnr_number}
                onChange={(e) =>
                  setForm({ ...form, pnr_number: e.target.value })
                }
                className={inputCls}
                placeholder="ABC123"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Trip Type
              </label>
              <div className="flex gap-4 items-center h-[42px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="trip_type"
                    value="one_way"
                    checked={form.trip_type === 'one_way'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        trip_type: e.target.value,
                        return_date: '',
                      })
                    }
                    className="w-4 h-4 text-primary accent-primary"
                  />
                  <span className="text-[13px] text-primary">
                    One Way
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="trip_type"
                    value="return"
                    checked={form.trip_type === 'return'}
                    onChange={(e) =>
                      setForm({ ...form, trip_type: e.target.value })
                    }
                    className="w-4 h-4 text-primary accent-primary"
                  />
                  <span className="text-[13px] text-primary">
                    Return
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Departure Date <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={form.departure_date}
                onChange={(e) =>
                  setForm({ ...form, departure_date: e.target.value })
                }
                className={inputCls}
              />
            </div>
            {form.trip_type === 'return' && (
              <div>
                <label className="label">
                  Return / Arrival Date
                </label>
                <input
                  type="datetime-local"
                  value={form.return_date}
                  onChange={(e) =>
                    setForm({ ...form, return_date: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Agent & Payment */}
          <SectionHeader
            icon={CreditCard}
            title="Agent & Payment"
            variant="warning"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Agent <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={form.agent_id}
                  onChange={(e) =>
                    setForm({ ...form, agent_id: e.target.value })
                  }
                  className={selectCls}
                >
                  <option value="">Select Agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label className="label">
                Total Payment <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.total_payment}
                onChange={(e) =>
                  setForm({ ...form, total_payment: e.target.value })
                }
                className={inputCls}
                placeholder="Amount from passenger"
              />
            </div>
            <div>
              <label className="label">
                Payment Method
              </label>
              <div className="relative">
                <select
                  value={form.payment_method}
                  onChange={(e) =>
                    setForm({ ...form, payment_method: e.target.value })
                  }
                  className={selectCls}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="online">Online</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Payment Remarks
              </label>
              <input
                type="text"
                value={form.payment_remarks}
                onChange={(e) =>
                  setForm({ ...form, payment_remarks: e.target.value })
                }
                className={inputCls}
                placeholder="e.g. Received 50,000 cash"
              />
            </div>
            <div>
              <label className="label">
                Received Payment
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.received_payment}
                onChange={(e) =>
                  setForm({ ...form, received_payment: e.target.value })
                }
                className={inputCls}
                placeholder="Amount received"
              />
            </div>
          </div>

          {/* Cost & Profit */}
          <SectionHeader
            icon={BarChart3}
            title="Cost & Profit"
            variant="success"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Purchase Rate <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.purchase_rate}
                onChange={(e) =>
                  setForm({ ...form, purchase_rate: e.target.value })
                }
                className={inputCls}
                placeholder="Cost from airline/supplier"
              />
            </div>
            <div>
              <label className="label">
                Agent Commission %
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.agent_commission_percentage}
                onChange={(e) =>
                  setForm({
                    ...form,
                    agent_commission_percentage: e.target.value,
                  })
                }
                className={inputCls}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          {/* Calculated fields - Read Only */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Ticket Profit
              </label>
              <input
                type="text"
                readOnly
                value={formatCurrency(preview.profit)}
                className={inputReadonly}
              />
            </div>
            <div>
              <label className="label">
                Agent Commission
              </label>
              <input
                type="text"
                readOnly
                value={formatCurrency(preview.agentComm)}
                className={inputReadonly}
              />
            </div>
            <div>
              <label className="label">
                Dues
              </label>
              <input
                type="text"
                readOnly
                value={formatCurrency(preview.dues)}
                className={
                  inputReadonly +
                  (preview.dues > 0
                    ? ' !text-danger'
                    : ' !text-success')
                }
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-success-light rounded-lg p-3 border border-success-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                Ticket Profit
              </p>
              <p className="text-[16px] font-semibold text-success mt-0.5">
                {formatCurrency(preview.profit)}
              </p>
            </div>
            <div className="bg-info-light rounded-lg p-3 border border-info-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                Agent Commission ({preview.pct}%)
              </p>
              <p className="text-[16px] font-semibold text-info mt-0.5">
                {formatCurrency(preview.agentComm)}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 border ${
                preview.dues > 0
                  ? 'bg-danger-light border-danger-border'
                  : 'bg-success-light border-success-border'
              }`}
            >
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                Dues
              </p>
              <p
                className={`text-[16px] font-semibold mt-0.5 ${
                  preview.dues > 0 ? 'text-danger' : 'text-success'
                }`}
              >
                {formatCurrency(preview.dues)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 rounded-full text-[13px] font-medium text-muted-foreground hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white rounded-full text-[13px] font-medium hover:opacity-90 hover:shadow-sm transition-all"
            >
              {editingId ? 'Update Booking' : 'Create Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Booking"
      >
        <div className="text-center py-2">
          <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-danger" />
          </div>
          <p className="text-[14px] text-primary mb-1">
            Are you sure you want to delete this booking?
          </p>
          <p className="text-[12px] text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="px-5 py-2.5 rounded-full text-[13px] font-medium text-muted-foreground hover:bg-hover border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleDelete(deleteConfirm)}
            className="px-5 py-2.5 bg-danger text-white rounded-md text-[13px] font-medium hover:opacity-90 transition-all"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

