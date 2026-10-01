import React, { useState } from 'react';
import { SlackStatus } from '../types';
import { saveSlackWebhook, disconnectSlack, testSlackNotification } from '../services/api';
import { X, Slack, Send, CheckCircle2, ShieldAlert, ExternalLink } from 'lucide-react';

interface SlackModalProps {
  userId?: string;
  slackStatus: SlackStatus | null;
  onClose: () => void;
  onStatusUpdate: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  userId,
  slackStatus,
  onClose,
  onStatusUpdate,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(slackStatus?.webhookUrl || '');
  const [channel, setChannel] = useState(slackStatus?.channel || '#general');
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;

    try {
      setLoading(true);
      setMessage(null);
      await saveSlackWebhook(webhookUrl, userId, channel);
      setMessage({ text: 'Slack Webhook connected successfully!', type: 'success' });
      onStatusUpdate();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save Slack Webhook', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestSending(true);
      setMessage(null);
      await testSlackNotification(userId);
      setMessage({ text: 'Live test rate limit notification sent to Slack!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || err.message, type: 'error' });
    } finally {
      setTestSending(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectSlack(userId);
      setMessage({ text: 'Slack disconnected', type: 'success' });
      onStatusUpdate();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl glass-card border border-slate-800 shadow-2xl relative overflow-hidden text-slate-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Slack className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Slack Rate Limit Alerts</h3>
              <p className="text-xs text-slate-400">Receive instant alerts when sender hourly limits are hit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 mb-4 rounded-xl text-xs flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveWebhook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Incoming Webhook URL or Bot Token
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Slack Channel</label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#general or #email-alerts"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <a
              href="http://localhost:5000/api/slack/auth"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Slack OAuth Authorize</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="flex items-center gap-2">
              {slackStatus?.isConnected && (
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testSending}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Send className="h-3 w-3 text-indigo-400" />
                  <span>{testSending ? 'Sending...' : 'Test Alert'}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !webhookUrl}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all"
              >
                {loading ? 'Saving...' : 'Save Connection'}
              </button>
            </div>
          </div>
        </form>

        {slackStatus?.isConnected && (
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Status: Connected to Slack</span>
            <button
              onClick={handleDisconnect}
              className="text-rose-400 hover:text-rose-300 font-semibold"
            >
              Disconnect Slack
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
