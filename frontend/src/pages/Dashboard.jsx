import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Ticket, Stamp, Users, AlertTriangle, TrendingUp,
  ArrowRight, CircleDollarSign, Plane, Wallet,
  ArrowUpRight, ArrowDownRight, TrendingDown
} from 'lucide-react';

const periods = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

function StatCard({ icon: Icon, label, value, color, onClick, subtitle }) {
  return (
    <div onClick={onClick} className="card card-hover p-5 cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">{label}</p>
          <p className="text-[22px] font-semibold text-primary mt-1.5 truncate">{value}</p>
          {subtitle && <p className="text-[11px] text-tertiary mt-1">{subtitle}</p>}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState({ passport: { count: 0, alerts: [] }, payments: { count: 0, total_due: 0, alerts: [] } });
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    setError('');
    const [dashboardRes, passportRes, paymentsRes] = await Promise.allSettled([
      api.get('/dashboard/', { params: { period } }),
      api.get('/alerts/passport-expiry'),
      api.get('/alerts/pending-payments'),
    ]);

    if (dashboardRes.status === 'fulfilled') {
      setStats(dashboardRes.value.data);
    } else {
      setError('Failed to load dashboard');
      toast.error('Failed to load dashboard');
    }

    if (passportRes.status === 'fulfilled') {
      setAlerts(prev => ({ ...prev, passport: passportRes.value.data }));
    }
    if (paymentsRes.status === 'fulfilled') {
      setAlerts(prev => ({ ...prev, payments: paymentsRes.value.data }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [period]);

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-secondary">Loading dashboard...</p>
      </div>
    </div>
  );

  if (error && !stats) return (
    <div className="card border-danger bg-danger-light px-4 py-3 text-[13px] text-danger">
      {error}
    </div>
  );

  const maxRevenue = Math.max(...(stats?.monthly_revenue || []).map(m => m.revenue), 1);
  const totalPassengers = (stats?.total_tickets || 0) + (stats?.total_visas || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-primary">Dashboard</h1>
          <p className="text-[13px] text-secondary mt-0.5">Welcome back, {user?.full_name || user?.username || 'User'}</p>
        </div>
        <div className="flex gap-1 bg-card rounded-full border border-border p-1">
          {periods.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${period === p.value ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:bg-hover'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Banners */}
      {(alerts.passport.count > 0 || alerts.payments.count > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alerts.passport.count > 0 && (
            <div className="card bg-warning-light border-warning p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-warning" />
                <span className="text-[13px] font-medium text-warning">Passport Expiry Alerts</span>
              </div>
              <p className="text-[12px] text-secondary">{alerts.passport.count} passport(s) expiring within 30 days</p>
              <button onClick={() => navigate('/tickets')} className="text-[12px] text-primary mt-1 hover:underline font-medium">View Details →</button>
            </div>
          )}
          {alerts.payments.count > 0 && (
            <div className="card bg-danger-light border-danger p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-danger" />
                <span className="text-[13px] font-medium text-danger">Pending Payments</span>
              </div>
              <p className="text-[12px] text-secondary">{alerts.payments.count} record(s) — PKR {(alerts.payments.total_due || 0).toLocaleString()} due</p>
              <button onClick={() => navigate('/payments')} className="text-[12px] text-primary mt-1 hover:underline font-medium">View Details →</button>
            </div>
          )}
        </div>
      )}

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Passengers" value={totalPassengers} color="var(--primary)" onClick={() => navigate('/tickets')} subtitle="Tickets + Visas" />
        <StatCard icon={Ticket} label="Total Tickets" value={stats.total_tickets} color="var(--info)" onClick={() => navigate('/tickets')} subtitle="Flight bookings" />
        <StatCard icon={Stamp} label="Total Visas" value={stats.total_visas} color="var(--warning)" onClick={() => navigate('/visas')} subtitle="Visa bookings" />
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border border-success/20 bg-success-light/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success flex items-center justify-center">
              <CircleDollarSign size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Total Received</p>
              <p className="text-[18px] font-semibold text-success mt-0.5">PKR {(stats.total_received || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-5 border border-danger/20 bg-danger-light/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Total Dues</p>
              <p className="text-[18px] font-semibold text-danger mt-0.5">PKR {(stats.total_dues || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-5 border border-warning/20 bg-warning-light/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">Agent Commission</p>
              <p className="text-[18px] font-semibold text-warning mt-0.5">PKR {(stats.agent_commission || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MY COMMISSION Card */}
      <div className="card p-5 border-2 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Wallet size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-secondary uppercase tracking-wider font-medium">My Commission (Business Profit)</p>
            <p className="text-[28px] font-bold text-primary mt-1">PKR {(stats.my_commission || 0).toLocaleString()}</p>
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-[11px] text-tertiary">Ticket Profit</p>
                <p className="text-[14px] font-semibold text-primary">PKR {(stats.ticket_profit || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-tertiary">Visa Profit</p>
                <p className="text-[14px] font-semibold text-primary">PKR {(stats.visa_profit || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="section-header">
            <TrendingUp size={18} className="text-primary" />
            <h3>Monthly Revenue</h3>
          </div>
          <div className="flex items-end gap-2 md:gap-3 h-44">
            {(stats?.monthly_revenue || []).map((m, i) => {
              const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
                  <span className="text-[10px] text-tertiary opacity-0 group-hover/bar:opacity-100 transition-opacity">{m.revenue > 0 ? `PKR ${(m.revenue / 1000).toFixed(0)}k` : ''}</span>
                  <div className="w-full rounded-t-md bg-primary transition-all duration-500 hover:opacity-80" style={{ height: `${Math.max(height, 2)}%` }}></div>
                  <span className="text-[10px] text-tertiary">{(m.month || '').split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Agents */}
        <div className="card p-5">
          <div className="section-header">
            <Users size={18} className="text-primary" />
            <h3>Top Agents</h3>
          </div>
          {(stats?.top_agents || []).length === 0 ? (
            <p className="text-[13px] text-secondary text-center py-8">No agent data yet</p>
          ) : (
            <div className="space-y-2">
              {(stats?.top_agents || []).map((a, i) => (
                <div key={a.id} onClick={() => navigate(`/agents/${a.id}`)} className="flex items-center gap-3 cursor-pointer hover:bg-hover p-2.5 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-medium flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-primary truncate">{a.name}</p>
                    <p className="text-[11px] text-tertiary">PKR {(a.revenue || 0).toLocaleString()}</p>
                  </div>
                  <ArrowRight size={14} className="text-tertiary flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tickets */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-[14px] font-semibold text-primary">Recent Bookings</h3>
            <button onClick={() => navigate('/tickets')} className="text-[12px] text-primary hover:underline font-medium">View All</button>
          </div>
          <div className="divide-y divide-default">
            {(!stats?.recent_tickets || stats.recent_tickets.length === 0) ? (
              <p className="px-5 py-8 text-center text-[13px] text-tertiary">No bookings yet</p>
            ) : stats.recent_tickets.map(t => (
              <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-hover transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-primary truncate">{t.passenger_name}</p>
                  <p className="text-[11px] text-tertiary">{t.sector} · {t.agent_name}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-[13px] font-medium text-primary">PKR {(t.total_payment || 0).toLocaleString()}</p>
                  <span className={`badge ${t.payment_status === 'paid' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>{t.payment_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Visas */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-[14px] font-semibold text-primary">Recent Visas</h3>
            <button onClick={() => navigate('/visas')} className="text-[12px] text-primary hover:underline font-medium">View All</button>
          </div>
          <div className="divide-y divide-default">
            {(!stats?.recent_visas || stats.recent_visas.length === 0) ? (
              <p className="px-5 py-8 text-center text-[13px] text-tertiary">No visa records yet</p>
            ) : stats.recent_visas.map(v => (
              <div key={v.id} onClick={() => navigate(`/visas/${v.id}`)} className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-hover transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-primary truncate">{v.passenger_name}</p>
                  <p className="text-[11px] text-tertiary">{v.visa_type} · {v.agent_name}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-[13px] font-medium text-primary">PKR {(v.total_charges || 0).toLocaleString()}</p>
                  <span className={`badge ${v.status === 'approved' ? 'bg-success-light text-success' : v.status === 'rejected' ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'}`}>{v.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
