import { useState, useEffect, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Save, Plus, X, Download, Upload, Server, Clock, RefreshCw, Lock } from 'lucide-react';

const settingConfigs = [
  { key: 'visa_types', label: 'Visa Types', description: 'Comma-separated list of visa types' },
  { key: 'visa_packages', label: 'Visa Packages', description: 'Comma-separated list of packages' },
  { key: 'payment_methods', label: 'Payment Methods', description: 'Comma-separated list of payment methods' },
  { key: 'airlines', label: 'Airlines', description: 'Comma-separated list of airlines' },
  { key: 'ticket_statuses', label: 'Ticket Statuses', description: 'Comma-separated list of ticket statuses' },
  { key: 'visa_statuses', label: 'Visa Statuses', description: 'Comma-separated list of visa statuses' },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [backupStats, setBackupStats] = useState(null);
  const [importing, setImporting] = useState(false);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/settings/'),
      api.get('/backup/stats'),
    ]).then(([settingsRes, backupRes]) => {
      const map = {};
      settingsRes.data.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      setBackupStats(backupRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (key) => {
    try {
      await api.post('/settings/', { key, value: settings[key] || '' });
      toast.success(`${key} updated`);
    } catch (err) { toast.error('Error saving'); }
  };

  const updateList = (key, index, value) => {
    const items = (settings[key] || '').split(',').map(s => s.trim());
    items[index] = value;
    setSettings({ ...settings, [key]: items.join(', ') });
  };

  const addListItem = (key) => {
    const current = settings[key] || '';
    setSettings({ ...settings, [key]: current ? current + ', ' : '' });
  };

  const removeListItem = (key, index) => {
    const items = (settings[key] || '').split(',').map(s => s.trim()).filter((_, i) => i !== index);
    setSettings({ ...settings, [key]: items.join(', ') });
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `visa_backup_${new Date().toISOString().slice(0,10)}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Database exported');
    } catch (err) { toast.error('Export failed'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Importing a database will replace all current data. A backup of the current database will be saved. Continue?')) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/backup/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Database imported successfully');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      toast.success('Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-secondary">Loading settings...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-[22px] font-semibold text-primary mb-1">Settings</h1>
      <p className="text-[13px] text-secondary mb-6">Manage dropdown values and system data</p>

      {/* Password Change Section */}
      <div className="card overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Lock size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-primary">Change Password</h3>
            <p className="text-[12px] text-secondary">Update your account password</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" value={passwords.current_password} onChange={e => setPasswords({...passwords, current_password: e.target.value})} required className="input" />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" value={passwords.new_password} onChange={e => setPasswords({...passwords, new_password: e.target.value})} required minLength={6} className="input" />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" value={passwords.confirm_password} onChange={e => setPasswords({...passwords, confirm_password: e.target.value})} required minLength={6} className="input" />
            </div>
          </div>
          <button type="submit" disabled={changingPassword} className="btn btn-primary disabled:opacity-50">
            {changingPassword ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Backup Section */}
      <div className="card overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Server size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-primary">Data Backup</h3>
            <p className="text-[12px] text-secondary">Export or import your database</p>
          </div>
        </div>

        <div className="p-6">
          {backupStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-[11px] text-secondary uppercase tracking-wider">DB Size</p>
                <p className="text-[16px] font-semibold text-primary">{backupStats.db_size_formatted}</p>
              </div>
              {Object.entries(backupStats.records).slice(0, 3).map(([key, val]) => (
                <div key={key} className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[11px] text-secondary uppercase tracking-wider">{key}</p>
                  <p className="text-[16px] font-semibold text-primary">{val}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={handleExport} className="btn btn-primary">
              <Download size={16} /> Export Database
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="btn btn-secondary disabled:opacity-50">
              {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? 'Importing...' : 'Import Database'}
            </button>
            <input ref={fileInputRef} type="file" accept=".db" onChange={handleImport} className="hidden" />
          </div>

          {backupStats?.backups?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-[13px] font-semibold text-secondary uppercase tracking-wider mb-3">Previous Backups</h4>
              <div className="space-y-2">
                {backupStats.backups.slice(0, 5).map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Clock size={16} className="text-secondary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-primary">{b.filename}</p>
                      <p className="text-[11px] text-tertiary">{new Date(b.date).toLocaleString()}</p>
                    </div>
                    <span className="text-[11px] text-tertiary">{(b.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Settings */}
      <div className="space-y-4">
        {settingConfigs.map(({ key, label, description }) => (
          <div key={key} className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[15px] font-semibold text-primary">{label}</h3>
                <p className="text-[12px] text-secondary">{description}</p>
              </div>
              <button onClick={() => handleSave(key)} className="btn btn-primary">
                <Save size={14} /> Save
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(settings[key] || '').split(',').filter(s => s.trim()).map((item, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1.5">
                  <input
                    value={item.trim()}
                    onChange={(e) => updateList(key, i, e.target.value)}
                    className="bg-transparent text-[13px] text-primary outline-none w-28"
                  />
                  <button onClick={() => removeListItem(key, i)} className="text-tertiary hover:text-danger p-0.5">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => addListItem(key)} className="flex items-center gap-1 border border-dashed border-strong rounded-full px-3 py-1.5 text-[13px] text-secondary hover:border-primary hover:text-primary transition-colors">
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
