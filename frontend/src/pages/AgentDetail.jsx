import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Edit2, Trash2, User, Phone, Mail,
  Percent, CheckCircle, XCircle, Ticket, Stamp, Banknote,
} from 'lucide-react';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [visas, setVisas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get(`/agents/${id}`),
      api.get(`/tickets/`, { params: { agent_id: id } }),
      api.get(`/visas/`, { params: { agent_id: id } }),
    ]).then(([agentRes, ticketsRes, visasRes]) => {
      if (!active) return;
      if (agentRes.status !== 'fulfilled') {
        toast.error('Agent not found');
        navigate('/agents');
        return;
      }
      setAgent(agentRes.value.data);
      if (ticketsRes.status === 'fulfilled') setTickets(ticketsRes.value.data);
      if (visasRes.status === 'fulfilled') setVisas(visasRes.value.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm('Delete this agent and all their records?')) return;
    try {
      await api.delete(`/agents/${id}`);
      toast.success('Agent deleted');
      navigate('/agents');
    } catch (err) {
      toast.error('Error deleting agent');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-secondary">Loading agent...</p>
      </div>
    </div>
  );
  if (!agent) return null;

  const totalRevenue = (tickets || []).reduce((sum, t) => sum + (t.total_payment || 0), 0) + (visas || []).reduce((sum, v) => sum + (v.total_charges || 0), 0);
  const totalCommission = (tickets || []).reduce((sum, t) => sum + (t.agent_commission || 0), 0) + (visas || []).reduce((sum, v) => sum + (v.commission || 0), 0);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/agents')} className="p-2 rounded-lg hover:bg-hover transition-colors">
          <ArrowLeft size={20} className="text-secondary" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-primary">Agent Details</h1>
          <p className="text-[13px] text-secondary mt-0.5">{agent.name}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => navigate('/agents', { state: { editId: agent.id } })} className="btn btn-secondary">
            <Edit2 size={16} /> Edit
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-primary to-primary-hover px-6 py-8">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold">
              {agent.name?.charAt(0)}
            </div>
            <div className="text-white">
              <h2 className="text-[24px] font-semibold">{agent.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${agent.status === 'active' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                  {agent.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {agent.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <Phone size={16} className="text-secondary" />
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Phone</p>
              <p className="text-[13px] text-primary">{agent.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <Mail size={16} className="text-secondary" />
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Email</p>
              <p className="text-[13px] text-primary">{agent.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <Percent size={16} className="text-secondary" />
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Commission Rate</p>
              <p className="text-[13px] text-primary">{agent.commission_rate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tickets', value: (tickets || []).length, icon: Ticket, color: 'primary', bg: 'var(--icon-primary)' },
          { label: 'Visas', value: (visas || []).length, icon: Stamp, color: 'success', bg: 'var(--icon-success)' },
          { label: 'Revenue', value: `PKR ${totalRevenue.toLocaleString()}`, icon: Banknote, color: 'warning', bg: 'var(--icon-warning)' },
          { label: 'Commission', value: `PKR ${totalCommission.toLocaleString()}`, icon: Percent, color: 'danger', bg: 'var(--icon-danger)' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
                <s.icon size={18} className={`text-${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">{s.label}</p>
                <p className="text-[16px] font-semibold text-primary truncate">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-primary">Recent Tickets</h3>
          <button onClick={() => navigate('/tickets')} className="text-[12px] text-primary font-medium hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Passenger', 'Route', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[11px] font-medium text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!tickets || tickets.length === 0) ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-tertiary">No tickets yet</td></tr>
              ) : tickets.slice(0, 5).map(t => (
                <tr key={t.id} className="table-row cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
                  <td className="px-5 py-3 text-[13px] text-primary font-medium">{t.passenger_name}</td>
                  <td className="px-5 py-3 text-[13px] text-secondary">{t.sector}</td>
                  <td className="px-5 py-3 text-[13px] text-primary font-medium">PKR {(t.total_payment || 0).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${t.payment_status === 'paid' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>{t.payment_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Visas */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-primary">Recent Visas</h3>
          <button onClick={() => navigate('/visas')} className="text-[12px] text-primary font-medium hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Passenger', 'Type', 'Charges', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[11px] font-medium text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!visas || visas.length === 0) ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-tertiary">No visas yet</td></tr>
              ) : visas.slice(0, 5).map(v => (
                <tr key={v.id} className="table-row cursor-pointer" onClick={() => navigate(`/visas/${v.id}`)}>
                  <td className="px-5 py-3 text-[13px] text-primary font-medium">{v.passenger_name}</td>
                  <td className="px-5 py-3 text-[13px] text-secondary capitalize">{v.visa_type}</td>
                  <td className="px-5 py-3 text-[13px] text-primary font-medium">PKR {(v.total_charges || 0).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${v.status === 'approved' ? 'bg-success-light text-success' : v.status === 'rejected' ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'}`}>{v.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
