import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Filter, X, Banknote, Download, Ticket, Stamp } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const searchTimeout = useRef(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (filterType) params.type = filterType;
    if (debouncedSearch) params.search = debouncedSearch;
    Promise.allSettled([
      api.get('/payments/', { params }),
      api.get('/payments/summary', { params: { agent_id: filterAgent || undefined } }),
    ]).then(([payRes, sumRes]) => {
      if (payRes.status === 'fulfilled') setPayments(payRes.value.data);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
    }).catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  };

  const exportCSV = () => {
    const params = {};
    if (filterAgent) params.agent_id = filterAgent;
    if (filterType) params.type = filterType;
    if (debouncedSearch) params.search = debouncedSearch;
    api.get('/payments/', { params }).then(res => {
      const rows = res.data;
      const header = 'Type,Passenger,Agent,Booking Ref,Total,Received,Dues,Method,Remarks,Created\n';
      const csv = rows.map(r =>
        `${r.type},${r.passenger_name},${r.agent_name},${r.booking_ref},${r.total_amount},${r.received},${r.dues},${r.payment_method},${r.payment_remarks},${r.created_at}`
      ).join('\n');
      const blob = new Blob([header + csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payments_export.csv';
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
  useEffect(() => { load(); }, [filterAgent, filterType, debouncedSearch]);

  const handleClick = (r) => {
    if (r.type === 'ticket') navigate(`/tickets/${r.id}`);
    else navigate(`/visas/${r.id}`);
  };

  const activeFilters = [filterAgent, filterType].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-primary">Payment Ledger</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{payments.length} payment{payments.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button onClick={exportCSV} className="btn btn-secondary">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div className="card p-5 card-hover">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Expected</p>
            <p className="text-[22px] font-semibold text-primary mt-1.5">PKR {(summary.total_expected || 0).toLocaleString()}</p>
          </div>
          <div className="card p-5 card-hover">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Received</p>
            <p className="text-[22px] font-semibold text-success mt-1.5">PKR {(summary.total_received || 0).toLocaleString()}</p>
          </div>
          <div className="card p-5 card-hover">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Dues</p>
            <p className="text-[22px] font-semibold text-danger mt-1.5">PKR {(summary.total_dues || 0).toLocaleString()}</p>
          </div>
          <div className="card p-5 card-hover">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">By Type</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="text-[13px] text-muted-foreground">Tickets: <span className="text-primary font-medium">PKR {(summary.ticket_received || 0).toLocaleString()}</span></p>
              <p className="text-[13px] text-muted-foreground">Visas: <span className="text-primary font-medium">PKR {(summary.visa_received || 0).toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="card mb-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Search size={18} className="text-muted-foreground" />
            <input type="text" placeholder="Search by passenger name or booking ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent outline-none text-[13px] text-primary placeholder:text-tertiary" />
            {search && <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-hover"><X size={16} className="text-tertiary" /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors relative ${showFilters ? 'bg-hover text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
            <Filter size={16} /><span>Filter</span>
            {activeFilters > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full text-[10px] flex items-center justify-center">{activeFilters}</span>}
          </button>
        </div>
        {showFilters && (
          <div className="px-4 pb-3 flex items-center gap-3 border-t border-border pt-3">
            <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="select w-auto">
              <option value="">All Agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="select w-auto">
              <option value="">All Types</option>
              <option value="ticket">Tickets</option>
              <option value="visa">Visas</option>
            </select>
            {activeFilters > 0 && (
              <button onClick={() => { setFilterAgent(''); setFilterType(''); }} className="flex items-center gap-1 text-[13px] text-primary hover:underline">
                <X size={14} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading payments...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Type', 'Passenger', 'Agent', 'Booking Ref', 'Total', 'Received', 'Dues', 'Method', 'Remarks'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-16 text-center">
                    <Banknote size={48} className="mx-auto text-tertiary mb-3" />
                    <p className="text-[14px] text-muted-foreground">No payments found</p>
                  </td></tr>
                ) : payments.map((r, i) => (
                  <tr key={`${r.type}-${r.id}-${i}`} className="table-row cursor-pointer" onClick={() => handleClick(r)}>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.type === 'ticket' ? 'bg-info-light text-info' : 'bg-warning-light text-warning'}`}>
                        {r.type === 'ticket' ? <Ticket size={12} /> : <Stamp size={12} />}
                        {r.type === 'ticket' ? 'Ticket' : 'Visa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-primary font-medium">{r.passenger_name}</td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{r.agent_name || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{r.booking_ref || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-primary font-medium">PKR {(r.total_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] text-success font-semibold">PKR {(r.received || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] text-danger font-semibold">{(r.dues || 0) > 0 ? `PKR ${(r.dues || 0).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.payment_method === 'cash' ? 'bg-warning-light text-warning' : 'bg-muted text-muted-foreground'}`}>
                        {r.payment_method === 'cash' ? 'Cash' : 'Bank'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground max-w-[150px] truncate">{r.payment_remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

