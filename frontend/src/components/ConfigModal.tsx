import React, { useState, useEffect } from 'react';
import { SystemConfig } from '../types';
import { getSystemConfig, updateSystemConfig } from '../services/api';
import { X, Settings, Save, CheckCircle2 } from 'lucide-react';

interface ConfigModalProps {
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ onClose }) => {
  const [config, setConfig] = useState<SystemConfig>({
    workerConcurrency: 5,
    minEmailDelayMs: 2000,
    maxEmailsPerHourPerSender: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    getSystemConfig()
      .then((cfg) => setConfig(cfg))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg('');
      const res = await updateSystemConfig(config);
      setConfig(res.config);
      setSuccessMsg('Worker concurrency & hourly limits updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`Error updating config: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl glass-card border border-slate-800 shadow-2xl relative overflow-hidden text-slate-200 p-6">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Queue & Worker System Limits</h3>
              <p className="text-xs text-slate-400">Dynamically tune worker concurrency & rate limits</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading system parameters...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                BullMQ Worker Concurrency (Parallel Job Execution)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={config.workerConcurrency}
                onChange={(e) => setConfig({ ...config, workerConcurrency: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Minimum Delay Between Email Sends (ms)
              </label>
              <input
                type="number"
                min={0}
                max={60000}
                value={config.minEmailDelayMs}
                onChange={(e) => setConfig({ ...config, minEmailDelayMs: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Provider throttling delay (e.g. 2000ms = 2s delay)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Max Emails Per Hour Per Sender (Rate Limit Threshold)
              </label>
              <input
                type="number"
                min={1}
                max={100000}
                value={config.maxEmailsPerHourPerSender}
                onChange={(e) => setConfig({ ...config, maxEmailsPerHourPerSender: parseInt(e.target.value, 10) || 10 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Exceeding jobs will be automatically rescheduled to next hour & notify Slack</p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Updating...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
