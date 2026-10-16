import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import PrintSlip, { SlipRow, SlipSection } from '../components/PrintSlip';
import {
  ArrowLeft, Edit2, Trash2, Plane, Calendar, CreditCard,
  User, Phone, Globe, FileText, Clock, CheckCircle, AlertCircle, Printer, Hash,
} from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/tickets/${id}`)
      .then(res => { if (active) setTicket(res.data); })
      .catch(() => { if (active) { toast.error('Ticket not found'); navigate('/tickets'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm('Delete this ticket permanently?')) return;
    try {
      await api.delete(`/tickets/${id}`);
      toast.success('Ticket deleted');
      navigate('/tickets');
    } catch (err) {
      toast.error('Error deleting ticket');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-secondary">Loading ticket...</p>
      </div>
    </div>
  );
  if (!ticket) return null;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-secondary" />
      </div>
      <div>
        <p className="text-[11px] text-secondary uppercase tracking-wider font-medium">{label}</p>
        <p className="text-[13px] text-primary mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/tickets')} className="p-2 rounded-lg hover:bg-hover transition-colors">
          <ArrowLeft size={20} className="text-secondary" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-primary">Ticket Details</h1>
          <p className="text-[13px] text-secondary mt-0.5">PNR {ticket.pnr || '—'} — {ticket.passenger_name}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setPrintOpen(true)} className="btn btn-secondary">
            <Printer size={16} /> Print Slip
          </button>
          <button onClick={() => navigate('/tickets', { state: { editId: ticket.id } })} className="btn btn-secondary">
            <Edit2 size={16} /> Edit
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 card overflow-hidden">
          {/* Status Banner */}
          <div className={`px-6 py-4 flex items-center gap-3 ${
            ticket.payment_status === 'paid' ? 'bg-success-light' :
            ticket.payment_status === 'partial' ? 'bg-warning-light' : 'bg-danger-light'
          }`}>
            {ticket.payment_status === 'paid' ? <CheckCircle size={20} className="text-success" /> :
             ticket.payment_status === 'partial' ? <Clock size={20} className="text-warning" /> :
             <AlertCircle size={20} className="text-danger" />}
            <span className={`text-[14px] font-medium capitalize ${
              ticket.payment_status === 'paid' ? 'text-success' :
              ticket.payment_status === 'partial' ? 'text-warning' : 'text-danger'
            }`}>Payment {ticket.payment_status}</span>
            <span className="ml-auto text-[12px] text-secondary bg-card/60 px-3 py-1 rounded-full font-medium">
              {ticket.trip_type === 'return' ? 'Return Flight' : 'One Way'}
            </span>
          </div>

          <div className="p-6">
            {/* Route Header */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
              <div className="text-center">
                <p className="text-[28px] font-bold text-primary">{ticket.sector || '—'}</p>
                <p className="text-[12px] text-secondary">Sector</p>
              </div>
              <div className="flex-1 flex items-center justify-center px-6">
                <div className="w-full border-t-2 border-dashed border-strong relative">
                  <Plane size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-card px-2" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-medium text-primary">{ticket.airline || '—'}</p>
                <p className="text-[12px] text-secondary">Airline</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow icon={Hash} label="PNR Number" value={ticket.pnr} />
              <InfoRow icon={User} label="Passenger" value={ticket.passenger_name} />
              <InfoRow icon={Phone} label="Contact Number" value={ticket.contact_number} />
              <InfoRow icon={Calendar} label="Date of Birth" value={ticket.dob} />
              <InfoRow icon={FileText} label="Passport Number" value={ticket.passport_number} />
              <InfoRow icon={Calendar} label="Passport Expiry" value={ticket.passport_expiry} />
              <InfoRow icon={Globe} label="Sector" value={ticket.sector} />
              <InfoRow icon={Globe} label="Airline" value={ticket.airline} />
              <InfoRow icon={Calendar} label="Departure" value={ticket.departure_date} />
              {ticket.trip_type === 'return' && (
                <InfoRow icon={Calendar} label="Return / Arrival" value={ticket.return_date} />
              )}
            </div>

            {ticket.payment_remarks && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-2">Payment Remarks</p>
                <p className="text-[13px] text-primary bg-muted rounded-lg p-4">{ticket.payment_remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Sidebar */}
        <div className="space-y-4">
          <div className="card p-6">
            <div className="section-header">
              <CreditCard size={16} className="text-primary" />
              <h3>Financial Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-secondary">Total Payment</span>
                <span className="text-[14px] text-primary font-semibold">PKR {(ticket.total_payment || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-secondary">Received Payment</span>
                <span className="text-[14px] text-success font-semibold">PKR {(ticket.received_payment || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-secondary">Dues</span>
                <span className={`text-[14px] font-semibold ${(ticket.dues || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                  PKR {(ticket.dues || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-secondary">Payment Method</span>
                <span className="text-[13px] text-primary font-medium capitalize">{ticket.payment_method || 'Cash'}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="section-header">
              <FileText size={16} className="text-primary" />
              <h3>Cost & Profit</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-secondary">Purchase Rate</span>
                <span className="text-[14px] text-primary font-semibold">PKR {(ticket.purchase_rate || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-secondary">Ticket Profit</span>
                <span className={`text-[14px] font-semibold ${(ticket.ticket_profit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  PKR {(ticket.ticket_profit || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-secondary">Agent Commission ({ticket.agent_commission_percentage || 0}%)</span>
                <span className="text-[14px] text-info font-semibold">PKR {(ticket.agent_commission || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="section-header">
              <User size={16} className="text-primary" />
              <h3>Agent</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {ticket.agent_name?.charAt(0)}
              </div>
              <div>
                <p className="text-[14px] font-medium text-primary">{ticket.agent_name}</p>
                <p className="text-[12px] text-secondary">Agent</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrintSlip isOpen={printOpen} onClose={() => setPrintOpen(false)} title="TICKET BOOKING SLIP">
        <SlipRow label="PNR" value={ticket.pnr} bold />
        <SlipRow label="Passenger" value={ticket.passenger_name} bold />
        <SlipRow label="Contact" value={ticket.contact_number} />
        <SlipRow label="Passport" value={ticket.passport_number} />
        <SlipSection title="Flight Details" />
        <SlipRow label="Airline" value={ticket.airline} />
        <SlipRow label="Sector" value={ticket.sector} />
        <SlipRow label="Trip Type" value={ticket.trip_type === 'return' ? 'Return' : 'One Way'} />
        <SlipRow label="Departure" value={ticket.departure_date} />
        {ticket.trip_type === 'return' && <SlipRow label="Return" value={ticket.return_date} />}
        <SlipSection title="Payment" />
        <SlipRow label="Total Payment" value={`PKR ${(ticket.total_payment || 0).toLocaleString()}`} bold />
        <SlipRow label="Received" value={`PKR ${(ticket.received_payment || 0).toLocaleString()}`} />
        <SlipRow label="Dues" value={`PKR ${(ticket.dues || 0).toLocaleString()}`} bold />
        <SlipRow label="Purchase Rate" value={`PKR ${(ticket.purchase_rate || 0).toLocaleString()}`} />
        <SlipRow label="Ticket Profit" value={`PKR ${(ticket.ticket_profit || 0).toLocaleString()}`} bold />
        <SlipRow label="Agent Commission" value={`PKR ${(ticket.agent_commission || 0).toLocaleString()}`} bold />
        <SlipRow label="Payment Status" value={(ticket.payment_status || '').toUpperCase()} bold />
        <SlipRow label="Agent" value={ticket.agent_name} />
        {ticket.payment_remarks && <SlipRow label="Remarks" value={ticket.payment_remarks} />}
      </PrintSlip>
    </div>
  );
}
