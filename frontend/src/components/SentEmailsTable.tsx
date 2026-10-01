import React from 'react';
import { EmailJob } from '../types';
import { format } from 'date-fns';
import { ExternalLink, CheckCircle2, XCircle, Mail, Clock, RefreshCw, AlertCircle } from 'lucide-react';

interface SentEmailsTableProps {
  emails: EmailJob[];
  loading: boolean;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({ emails, loading }) => {
  if (loading && emails.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-400" />
        <p className="text-xs">Loading sent email history...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
          <Mail className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">No Sent Emails Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Delivered emails and test SMTP previews from Ethereal will appear here automatically as jobs execute.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
          <tr>
            <th className="px-4 py-3">Recipient Lead</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">Sent Time</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ethereal Preview</th>
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
                {email.errorReason ? (
                  <div className="flex items-center gap-1 text-[11px] text-rose-400 mt-0.5" title={email.errorReason}>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">{email.errorReason}</span>
                  </div>
                ) : (
                  <div className="max-w-xs truncate text-[11px] text-slate-500 mt-0.5">{email.body.replace(/<[^>]+>/g, '')}</div>
                )}
              </td>

              {/* Sent Time */}
              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{email.sentAt ? format(new Date(email.sentAt), 'MMM dd, yyyy HH:mm:ss') : format(new Date(email.updatedAt), 'MMM dd, yyyy HH:mm:ss')}</span>
                </div>
              </td>

              {/* Status */}
              <td className="px-4 py-3 whitespace-nowrap">
                {email.status === 'SENT' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    Sent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <XCircle className="h-3 w-3 text-rose-400" />
                    Failed
                  </span>
                )}
              </td>

              {/* Ethereal SMTP Link */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {email.etherealPreviewUrl ? (
                  <a
                    href={email.etherealPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all shadow-sm"
                  >
                    <span>View in Ethereal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500">N/A</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
