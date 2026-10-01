import React, { useState } from 'react';
import { parseCsvFile, scheduleEmails } from '../services/api';
import { X, Upload, Send, Calendar, Clock, ShieldAlert, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface ComposeModalProps {
  userEmail?: string;
  userId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  userEmail = 'outreach@reachinbox.ai',
  userId,
  onClose,
  onSuccess,
}) => {
  const [senderEmail, setSenderEmail] = useState(userEmail);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rawRecipientsText, setRawRecipientsText] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  // Scheduling options
  const [startTime, setStartTime] = useState(
    new Date(Date.now() + 60000).toISOString().slice(0, 16) // Default 1 minute in future
  );
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-parse text input or file
  const handleTextChange = (text: string) => {
    setRawRecipientsText(text);
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const unique = Array.from(new Set(matches));
    setParsedEmails(unique);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      setErrorMsg('');
      const res = await parseCsvFile(file);
      setUploadFileName(res.fileName);
      setParsedEmails(res.emails);
      setRawRecipientsText(res.emails.join('\n'));
    } catch (err: any) {
      setErrorMsg(`CSV Upload Error: ${err.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMsg('Please provide an email subject.');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Please provide an email body.');
      return;
    }
    if (parsedEmails.length === 0) {
      setErrorMsg('Please enter or upload at least one valid recipient email address.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      await scheduleEmails({
        senderEmail,
        subject,
        body,
        recipients: parsedEmails,
        startTime: new Date(startTime).toISOString(),
        delaySeconds,
        hourlyLimit,
        userId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to schedule emails.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl my-8 rounded-2xl glass-card border border-slate-800 shadow-2xl relative overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Compose & Schedule Outreach Campaign</h3>
              <p className="text-xs text-slate-400">Configure BullMQ delayed jobs with provider rate limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sender Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sender Email Address</label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="sender@domain.com"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Scaling lead acquisition with ReachInbox AI"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Body (HTML / Text)</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="<p>Hi there,</p><p>We noticed your team is building email infrastructure...</p>"
              required
            />
          </div>

          {/* Recipients & File Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                Lead Recipients ({parsedEmails.length} detected)
              </label>

              {/* Upload CSV Button */}
              <label className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" />
                <span>{uploadingFile ? 'Parsing...' : 'Upload CSV / TXT'}</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>
            </div>

            <textarea
              rows={3}
              value={rawRecipientsText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Enter email addresses (one per line, comma separated, or upload a CSV file)..."
            />

            {uploadFileName && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                <FileText className="h-3.5 w-3.5" />
                <span>File loaded: {uploadFileName} ({parsedEmails.length} valid lead emails)</span>
              </div>
            )}
          </div>

          {/* Scheduling & Throttling Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Delay per email */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-violet-400" />
                <span>Delay per Email (sec)</span>
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Hourly Limit */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-400" />
                <span>Sender Hourly Limit</span>
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 10)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || parsedEmails.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Scheduling Campaign...' : `Schedule ${parsedEmails.length} Email(s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
