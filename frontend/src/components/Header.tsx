import React from 'react';
import { User, SlackStatus } from '../types';
import { LogOut, Slack, ExternalLink, Settings, Sparkles, Mail } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  slackStatus: SlackStatus | null;
  onLogout: () => void;
  onOpenSlackModal: () => void;
  onOpenConfigModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  slackStatus,
  onLogout,
  onOpenSlackModal,
  onOpenConfigModal,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="h-full w-full rounded-[10px] bg-slate-950 flex items-center justify-center">
            <Mail className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight">ReachInbox</h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Email Scheduler
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Production-Grade BullMQ & Redis Engine</p>
        </div>
      </div>

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-3">
        {/* Slack Connection Widget */}
        <button
          onClick={onOpenSlackModal}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
            slackStatus?.isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
          }`}
        >
          <Slack className="h-3.5 w-3.5" />
          <span>{slackStatus?.isConnected ? 'Slack Connected' : 'Connect Slack'}</span>
          <span className={`h-2 w-2 rounded-full ${slackStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </button>

        {/* Live BullMQ Board Button */}
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>BullMQ Dashboard</span>
          <ExternalLink className="h-3 w-3 text-slate-500" />
        </a>

        {/* Config / System Limits Button */}
        <button
          onClick={onOpenConfigModal}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="System & Worker Limits"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt={user.name}
                className="h-8 w-8 rounded-full border border-indigo-500/40 bg-slate-900 object-cover"
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{user.email}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
