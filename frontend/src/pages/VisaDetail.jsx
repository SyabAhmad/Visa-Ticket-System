import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import PrintSlip, { SlipRow, SlipSection } from '../components/PrintSlip';
import {
  ArrowLeft, Edit2, Trash2, User, Phone, Briefcase, Globe,
  CheckCircle, XCircle, Clock, FileText, Printer, Hash, Calendar,
} from 'lucide-react';

export default function VisaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visa, setVisa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/visas/${id}`)
      .then(res => { if (active) setVisa(res.data); })
      .catch(() => { if (active) { toast.error('Visa not found'); navigate('/visas'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm('Delete this visa permanently?')) return;
    try {
      await api.delete(`/visas/${id}`);
      toast.success('Visa deleted');
      navigate('/visas');
    } catch (err) {
      toast.error('Error deleting visa');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading visa...</p>
      </div>
    </div>
  );
  if (!visa) return null;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-[13px] text-primary mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );

  const statusConfig = {
    approved: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle, label: 'Approved' },
    rejected: { bg: 'bg-danger-light', text: 'text-danger', icon: XCircle, label: 'Rejected' },
    pending: { bg: 'bg-warning-light', text: 'text-warning', icon: Clock, label: 'Pending' },
  };
  const status = statusConfig[visa.status] || statusConfig.pending;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/visas')} className="p-2 rounded-lg hover:bg-hover transition-colors">
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-primary">Visa Details</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{visa.visa_type} — {visa.passenger_name}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setPrintOpen(true)} className="btn btn-secondary">
            <Printer size={16} /> Print Slip
          </button>
          <button onClick={() => navigate('/visas', { state: { editId: visa.id } })} className="btn btn-secondary">
            <Edit2 size={16} /> Edit
          </button>
          <button onClick={handleDelete} className="btn btn-danger">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Card */}
          <div className={`${status.bg} rounded-xl p-5 flex items-center gap-4`}>
            <status.icon size={28} className={status.text} />
            <div>
              <p className={`text-[16px] font-medium ${status.text}`}>{status.label}</p>
              <p className="text-[13px] text-muted-foreground">Visa status</p>
            </div>
          </div>

          {/* Personal Info Card */}
          <div className="card p-6">
            <div className="section-header">
              <User size={16} className="text-primary" />
              <h3>Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow icon={User} label="Passenger" value={visa.passenger_name} />
              <InfoRow icon={Phone} label="Contact Number" value={visa.contact_number} />
              <InfoRow icon={Globe} label="Passport Number" value={visa.passport_number} />
              <InfoRow icon={Calendar} label="Date of Birth" value={visa.dob} />
              <InfoRow icon={Calendar} label="Passport Expiry" value={visa.passport_expiry} />
              <InfoRow icon={Briefcase} label="Occupation" value={visa.occupation} />
            </div>
          </div>

          {/* Visa Info Card */}
          <div className="card p-6">
            <div className="section-header">
              <Globe size={16} className="text-primary" />
              <h3>Visa Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow icon={Globe} label="Visa Type" value={visa.visa_type} />
              <InfoRow icon={Hash} label="Visa Number" value={visa.visa_number} />
              <InfoRow icon={FileText} label="Sponsor Number" value={visa.sponsor_number} />
            </div>
          </div>
        </div>

        {/* Financial Sidebar */}
        <div className="space-y-4">
          {/* Charges Breakdown */}
          <div className="card p-6">
            <div className="section-header">
              <FileText size={16} className="text-primary" />
              <h3>Charges Breakdown</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Visa Process</span>
                <span className="text-[14px] text-primary font-semibold">PKR {(visa.visa_process_charges || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Medical Token</span>
                <span className="text-[14px] text-primary font-semibold">PKR {(visa.medical_token_charges || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Agreement Paper</span>
                <span className="text-[14px] text-primary font-semibold">PKR {(visa.agreement_paper_charges || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Extra Charges</span>
                <span className="text-[14px] text-primary font-semibold">PKR {(visa.extra_charges || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 pt-1">
                <span className="text-[13px] font-semibold text-primary">Total Charges</span>
                <span className="text-[16px] font-bold text-primary">PKR {(visa.total_charges || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment & Profit */}
          <div className="card p-6">
            <div className="section-header">
              <Banknote size={16} className="text-primary" />
              <h3>Payment & Profit</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Received</span>
                <span className="text-[14px] text-success font-semibold">PKR {(visa.received || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Dues</span>
                <span className={`text-[14px] font-semibold ${(visa.dues || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                  PKR {(visa.dues || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Purchase Rate</span>
                <span className="text-[14px] text-primary font-semibold">PKR {(visa.purchase_rate || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 pt-1">
                <span className="text-[13px] font-semibold text-primary">Commission / Profit</span>
                <span className={`text-[16px] font-bold ${(visa.commission || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  PKR {(visa.commission || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Agent */}
          <div className="card p-6">
            <div className="section-header">
              <User size={16} className="text-primary" />
              <h3>Agent</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {visa.agent_name?.charAt(0)}
              </div>
              <div>
                <p className="text-[14px] font-medium text-primary">{visa.agent_name}</p>
                <p className="text-[12px] text-muted-foreground">Agent</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrintSlip isOpen={printOpen} onClose={() => setPrintOpen(false)} title="VISA PROCESSING SLIP">
        <SlipRow label="Passenger" value={visa.passenger_name} bold />
        <SlipRow label="Contact" value={visa.contact_number} />
        <SlipRow label="Passport" value={visa.passport_number} />
        <SlipRow label="DOB" value={visa.dob} />
        <SlipRow label="Passport Expiry" value={visa.passport_expiry} />
        <SlipRow label="Occupation" value={visa.occupation} />
        <SlipSection title="Visa Details" />
        <SlipRow label="Visa Type" value={visa.visa_type} bold />
        <SlipRow label="Visa Number" value={visa.visa_number} />
        <SlipRow label="Sponsor Number" value={visa.sponsor_number} />
        <SlipSection title="Charges" />
        <SlipRow label="Visa Process" value={`PKR ${(visa.visa_process_charges || 0).toLocaleString()}`} />
        <SlipRow label="Medical Token" value={`PKR ${(visa.medical_token_charges || 0).toLocaleString()}`} />
        <SlipRow label="Agreement Paper" value={`PKR ${(visa.agreement_paper_charges || 0).toLocaleString()}`} />
        <SlipRow label="Extra Charges" value={`PKR ${(visa.extra_charges || 0).toLocaleString()}`} />
        <SlipRow label="Total Charges" value={`PKR ${(visa.total_charges || 0).toLocaleString()}`} bold />
        <SlipSection title="Payment & Profit" />
        <SlipRow label="Received" value={`PKR ${(visa.received || 0).toLocaleString()}`} />
        <SlipRow label="Dues" value={`PKR ${(visa.dues || 0).toLocaleString()}`} bold />
        <SlipRow label="Purchase Rate" value={`PKR ${(visa.purchase_rate || 0).toLocaleString()}`} />
        <SlipRow label="Commission" value={`PKR ${(visa.commission || 0).toLocaleString()}`} bold />
        <SlipRow label="Status" value={(visa.status || '').toUpperCase()} bold />
        <SlipRow label="Agent" value={visa.agent_name} />
      </PrintSlip>
    </div>
  );
}

function Banknote(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

