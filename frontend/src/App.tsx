import React, { useState, useEffect } from 'react';
import { User, EmailJob, SlackStatus, QueueMetrics } from './types';
import {
  getCurrentUser,
  getScheduledEmails,
  getSentEmails,
  searchEmails,
  cancelEmailJob,
  getQueueMetrics,
  getSlackStatus,
} from './services/api';

import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { ComposeModal } from './components/ComposeModal';
import { ScheduledEmailsTable } from './components/ScheduledEmailsTable';
import { SentEmailsTable } from './components/SentEmailsTable';
import { SlackModal } from './components/SlackModal';
import { ConfigModal } from './components/ConfigModal';
import { QueueMetricsBar } from './components/QueueMetricsBar';

import { Plus, Search, Calendar, Send, Sparkles, RefreshCw, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Tabs: 'scheduled' | 'sent' | 'search'
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'search'>('scheduled');

  // Email Lists
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [searchResults, setSearchResults] = useState<EmailJob[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Metrics & Slack
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  // Modals
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Fetch Current User on Mount
  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  // Poll Metrics and Slack Status periodically
  const fetchMetricsAndSlack = async () => {
    try {
      const [m, s] = await Promise.all([
        getQueueMetrics(),
        getSlackStatus(user?.id),
      ]);
      setMetrics(m);
      setSlackStatus(s);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMetricsAndSlack();
      const interval = setInterval(fetchMetricsAndSlack, 4000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load Emails based on active tab
  const loadEmails = async () => {
    if (!user) return;
    try {
      setLoadingEmails(true);
      if (activeTab === 'scheduled') {
        const data = await getScheduledEmails(1, 100, searchQuery);
        setScheduledEmails(data.emails);
      } else if (activeTab === 'sent') {
        const data = await getSentEmails(1, 100, searchQuery);
        setSentEmails(data.emails);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadEmails();
      const interval = setInterval(loadEmails, 3000); // Live poll queue state
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  // Elasticsearch Search Trigger
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      if (activeTab === 'search') setActiveTab('scheduled');
      loadEmails();
      return;
    }

    try {
      setIsSearching(true);
      setActiveTab('search');
      const data = await searchEmails(query);
      setSearchResults(data.emails);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Cancel Job Handler
  const handleCancelJob = async (id: string) => {
    try {
      await cancelEmailJob(id);
      loadEmails();
      fetchMetricsAndSlack();
    } catch (err: any) {
      alert(`Could not cancel email job: ${err.message}`);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      {/* Header */}
      <Header
        user={user}
        slackStatus={slackStatus}
        onLogout={() => setUser(null)}
        onOpenSlackModal={() => setShowSlackModal(true)}
        onOpenConfigModal={() => setShowConfigModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Top Queue Metrics Widget */}
        <QueueMetricsBar metrics={metrics} />

        {/* Dashboard Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Search Bar (Elasticsearch powered) */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search recipient, subject, body via Elasticsearch..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm transition-all"
            />
            {isSearching && (
              <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 animate-spin" />
            )}
          </div>

          {/* Compose New Email Button */}
          <button
            onClick={() => setShowComposeModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-800 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'scheduled'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Scheduled Emails</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {metrics?.db?.scheduled || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'sent'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Sent Emails</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {metrics?.db?.sent || 0}
              </span>
            </button>

            {activeTab === 'search' && (
              <button
                className="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 border-violet-500 text-violet-400"
              >
                <Search className="h-4 w-4" />
                <span>Elasticsearch Results ({searchResults.length})</span>
              </button>
            )}
          </div>

          <button
            onClick={loadEmails}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
            title="Refresh Table"
          >
            <RefreshCw className={`h-4 w-4 ${loadingEmails ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'scheduled' && (
          <ScheduledEmailsTable
            emails={scheduledEmails}
            loading={loadingEmails}
            onCancelJob={handleCancelJob}
            onRefresh={loadEmails}
          />
        )}

        {activeTab === 'sent' && (
          <SentEmailsTable
            emails={sentEmails}
            loading={loadingEmails}
          />
        )}

        {activeTab === 'search' && (
          <div>
            <div className="mb-3 text-xs text-slate-400">
              Showing full-text search matches for <span className="text-indigo-400 font-semibold">"{searchQuery}"</span> via Elasticsearch:
            </div>
            <SentEmailsTable
              emails={searchResults}
              loading={isSearching}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {showComposeModal && (
        <ComposeModal
          userEmail={user.email}
          userId={user.id}
          onClose={() => setShowComposeModal(false)}
          onSuccess={() => {
            loadEmails();
            fetchMetricsAndSlack();
          }}
        />
      )}

      {showSlackModal && (
        <SlackModal
          userId={user.id}
          slackStatus={slackStatus}
          onClose={() => setShowSlackModal(false)}
          onStatusUpdate={fetchMetricsAndSlack}
        />
      )}

      {showConfigModal && (
        <ConfigModal onClose={() => setShowConfigModal(false)} />
      )}
    </div>
  );
};

export default App;
