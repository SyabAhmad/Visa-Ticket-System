import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Clock, Ticket, Stamp, Users, Banknote, ChevronLeft, ChevronRight } from 'lucide-react';

const entityIcons = {
  ticket: { icon: Ticket, color: 'primary', bg: 'bg-icon-primary', link: '/tickets/' },
  visa: { icon: Stamp, color: 'warning', bg: 'bg-icon-warning', link: '/visas/' },
  cashout: { icon: Banknote, color: 'info', bg: 'bg-icon-info', link: '/payments/' },
  agent: { icon: Users, color: 'success', bg: 'bg-icon-success', link: '/agents/' },
};

const actionLabels = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

export default function Activity() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const load = () => {
    api.get('/activity/', { params: { page, per_page: 20 } }).then(res => {
      setLogs(res.data.logs);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    });
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-primary">Activity Log</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{total} record{total !== 1 ? 's' : ''} total</p>
      </div>

      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Clock size={48} className="mx-auto text-tertiary mb-3" />
            <p className="text-[14px] text-muted-foreground">No activity recorded yet</p>
            <p className="text-[12px] text-tertiary mt-1">Actions will appear here as you use the system</p>
          </div>
        ) : (
          <div className="divide-y divide-default">
            {logs.map(log => {
              const config = entityIcons[log.entity_type] || entityIcons.ticket;
              const Icon = config.icon;
              const actionLabel = actionLabels[log.action] || log.action;
              return (
                <div
                  key={log.id}
                  onClick={() => log.entity_id && navigate(`${config.link}${log.entity_id}`)}
                  className={`flex items-center gap-4 px-5 py-4 ${log.entity_id ? 'cursor-pointer hover:bg-hover transition-colors' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon size={18} className={`text-${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-primary">
                      <span className="font-medium">{log.username}</span>
                      <span className="text-muted-foreground"> {actionLabel} </span>
                      <span className="font-medium">{log.entity_type}</span>
                      {log.details && <span className="text-muted-foreground"> — {log.details}</span>}
                    </p>
                    <p className="text-[11px] text-tertiary mt-0.5">{log.created_at}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-[12px] text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={18} className="text-muted-foreground" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

