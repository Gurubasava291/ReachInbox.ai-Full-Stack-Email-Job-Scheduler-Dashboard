import React from 'react';
import { EmailJob } from '../types';
import { format } from 'date-fns';
import { Clock, AlertTriangle, Trash2, Mail, Calendar, RefreshCw } from 'lucide-react';

interface ScheduledEmailsTableProps {
  emails: EmailJob[];
  loading: boolean;
  onCancelJob: (id: string) => void;
  onRefresh: () => void;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({
  emails,
  loading,
  onCancelJob,
  onRefresh,
}) => {
  if (loading && emails.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
        <p className="text-xs">Fetching scheduled email queue...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
          <Calendar className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">No Scheduled Emails</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Your scheduled outreach queue is empty. Click "Compose New Email" above to queue up a lead sequence.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Scheduled
          </span>
        );
      case 'SENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Sending...
          </span>
        );
      case 'RATE_LIMITED_RESCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20" title="Rescheduled due to hourly rate limit">
            <AlertTriangle className="h-3 w-3 text-orange-400" />
            Rate-Limited (Rescheduled)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
          <tr>
            <th className="px-4 py-3">Recipient Lead</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">Scheduled Delivery Time</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-slate-800/30 transition-colors">
              {/* Recipient */}
              <td className="px-4 py-3 font-medium text-white">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{email.recipientEmail}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">From: {email.senderEmail}</div>
              </td>

              {/* Subject */}
              <td className="px-4 py-3">
                <div className="max-w-xs truncate font-medium text-slate-200">{email.subject}</div>
                <div className="max-w-xs truncate text-[11px] text-slate-500 mt-0.5">{email.body.replace(/<[^>]+>/g, '')}</div>
              </td>

              {/* Scheduled Time */}
              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>{format(new Date(email.scheduledAt), 'MMM dd, yyyy HH:mm:ss')}</span>
                </div>
              </td>

              {/* Status */}
              <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(email.status)}</td>

              {/* Actions */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onCancelJob(email.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Cancel & Remove from Queue"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
