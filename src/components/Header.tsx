import React, { useEffect, useState } from 'react';
import { NavTab } from './Sidebar.js';
import { useAuth } from '../context/AuthContext.js';
import { WhatsAppConnectionStatus } from '../types.js';
import { RefreshCw, Radio } from 'lucide-react';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { fetchWithAuth } = useAuth();
  const [status, setStatus] = useState<WhatsAppConnectionStatus>('Not Connected');
  const [phone, setPhone] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(false);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Real-time performance and lead acquisition statistics' },
    conversations: { title: 'Conversations', subtitle: 'WhatsApp live inbox & AI / Human handoff control' },
    leads: { title: 'Leads', subtitle: 'Track, qualify, and convert incoming customer leads' },
    'ai-agent': { title: 'AI Agent', subtitle: 'Configure Gemini AI instructions, knowledge & playground' },
    whatsapp: { title: 'WhatsApp Business API', subtitle: 'Official Meta Cloud API connection & webhook integration' },
    safety: { title: 'WhatsApp Safety Center', subtitle: 'Opt-in compliance, 24-hour service window enforcement, and AI safety rules' },
    settings: { title: 'Business Profile', subtitle: 'Define products, prices, and knowledge base for your AI Agent' },
    admin: { title: 'Platform Admin Overview', subtitle: 'Global metrics across all registered SaaS businesses' }
  };

  const fetchWhatsAppStatus = async () => {
    setChecking(true);
    try {
      const res = await fetchWithAuth('/api/whatsapp');
      if (res.ok) {
        const data = await res.json();
        if (data.connection) {
          setStatus(data.connection.status);
          setPhone(data.connection.phone_number || '');
        }
      }
    } catch (err) {
      // Gracefully handle transient network errors during dev server restarts or polling
      console.warn('Could not fetch WhatsApp status:', err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();
    const interval = setInterval(fetchWhatsAppStatus, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    if (status === 'Connected') {
      return (
        <button
          onClick={() => setActiveTab('whatsapp')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Connected {phone ? `(${phone})` : ''}</span>
        </button>
      );
    }
    if (status === 'Connection Error') {
      return (
        <button
          onClick={() => setActiveTab('whatsapp')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium hover:bg-rose-500/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>Connection Error</span>
        </button>
      );
    }
    return (
      <button
        onClick={() => setActiveTab('whatsapp')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-medium hover:bg-amber-500/20 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <span>Not Connected (Setup)</span>
      </button>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">
          {titles[activeTab]?.title || 'Fishcatch'}
        </h2>
        <p className="text-xs text-slate-500">{titles[activeTab]?.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {getStatusBadge()}
        <button
          onClick={fetchWhatsAppStatus}
          disabled={checking}
          title="Refresh connection status"
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};
