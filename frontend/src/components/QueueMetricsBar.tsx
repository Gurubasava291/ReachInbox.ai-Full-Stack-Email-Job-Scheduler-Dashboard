import React from 'react';
import { QueueMetrics } from '../types';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Layers } from 'lucide-react';

interface QueueMetricsBarProps {
  metrics: QueueMetrics | null;
}

export const QueueMetricsBar: React.FC<QueueMetricsBarProps> = ({ metrics }) => {
  const dbMetrics = metrics?.db || { scheduled: 0, sent: 0, failed: 0, rateLimitedRescheduled: 0 };
  const bullMetrics = metrics?.bullmq || { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Scheduled Metric */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl flex items-center justify-between border-slate-800">
        <div>
          <div className="text-xs font-semibold text-slate-400">Scheduled Queue</div>
          <div className="text-2xl font-extrabold text-white mt-1">{dbMetrics.scheduled}</div>
          <div className="text-[11px] text-indigo-400 mt-0.5 flex items-center gap-1">
            <span>{bullMetrics.delayed} delayed in BullMQ</span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
          <Clock className="h-5 w-5" />
        </div>
      </div>

      {/* Sent Metric */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl flex items-center justify-between border-slate-800">
        <div>
          <div className="text-xs font-semibold text-slate-400">Delivered Emails</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{dbMetrics.sent}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Fake SMTP via Ethereal</div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      </div>

      {/* Rate Limited Rescheduled Metric */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl flex items-center justify-between border-slate-800">
        <div>
          <div className="text-xs font-semibold text-slate-400">Rate-Limited Rescheduled</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">{dbMetrics.rateLimitedRescheduled}</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">Pushed to next hour window</div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5" />
        </div>
      </div>

      {/* Queue Workers Active */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl flex items-center justify-between border-slate-800">
        <div>
          <div className="text-xs font-semibold text-slate-400">Active Queue Jobs</div>
          <div className="text-2xl font-extrabold text-violet-400 mt-1">{bullMetrics.active}</div>
          <div className="text-[11px] text-violet-400 mt-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span>Worker Threads Active</span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
          <Layers className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
