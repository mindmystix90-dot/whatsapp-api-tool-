import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { DashboardStats } from '../types.js';
import { NavTab } from '../components/Sidebar.js';
import {
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
  Bot
} from 'lucide-react';

interface DashboardViewProps {
  setActiveTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const { fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStats = async () => {
    try {
      const res = await fetchWithAuth('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  const isWhatsAppConnected = stats?.whatsapp_status === 'Connected';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* WhatsApp Connection Alert Banner */}
      {!isWhatsAppConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">
                WhatsApp API Not Connected
              </h3>
              <p className="text-xs text-amber-800/80 mt-0.5">
                To receive live leads and automate replies, connect your Meta WhatsApp Business Cloud API.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 shrink-0"
          >
            <span>Connect WhatsApp Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Database Statistics Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Real Lead Acquisition Stats
          </h3>
          <span className="text-xs text-slate-500 font-mono">Source: Live Database</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Leads */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Leads</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_leads ?? 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Incoming Meta / WA leads</p>
            </div>
            <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* New Leads */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">New Leads</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{stats?.new_leads ?? 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Awaiting qualification</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
          </div>

          {/* Qualified Leads */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Qualified Leads</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{stats?.qualified_leads ?? 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Ready for closing</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Converted Leads */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Converted Leads</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.converted_leads ?? 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Successful sales/customers</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Conversations & Status summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Active WhatsApp Chats
            </span>
            <MessageSquare className="w-5 h-5 text-slate-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats?.active_conversations ?? 0}
            </span>
            <p className="text-xs text-slate-500 mt-1">Conversations stored in database</p>
          </div>
          <button
            onClick={() => setActiveTab('conversations')}
            className="mt-4 text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1.5"
          >
            <span>Open WhatsApp Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              AI Agent Status
            </span>
            <Bot className="w-5 h-5 text-slate-400" />
          </div>
          <div className="my-2">
            <span className="text-lg font-bold text-slate-900 block">Gemini 3.6 Flash</span>
            <p className="text-xs text-slate-500 mt-1">Auto-replies when in AI Mode</p>
          </div>
          <button
            onClick={() => setActiveTab('ai-agent')}
            className="mt-4 text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1.5"
          >
            <span>Configure AI Knowledge</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Meta Cloud API
            </span>
            <Radio className="w-5 h-5 text-slate-400" />
          </div>
          <div className="my-2">
            <span className={`text-base font-bold block ${isWhatsAppConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats?.whatsapp_status ?? 'Not Connected'}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.whatsapp_phone || 'Meta Graph API v21.0'}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className="mt-4 text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1.5"
          >
            <span>Setup Webhook & Keys</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Setup Checklist Guide */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 md:p-8 shadow-lg space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white">Fishcatch System Readiness Checklist</h3>
          <p className="text-xs text-slate-400 mt-1">
            Complete these 3 steps to start catching real leads from Meta WhatsApp Ads.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveTab('settings')}
            className="cursor-pointer bg-slate-800/80 hover:bg-slate-800 p-5 rounded-2xl border border-slate-700/80 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">STEP 1</span>
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-semibold text-sm text-white">Business Profile</h4>
            <p className="text-xs text-slate-400">
              Add your products, services, prices, FAQs, and hours so the AI knows your business.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('whatsapp')}
            className="cursor-pointer bg-slate-800/80 hover:bg-slate-800 p-5 rounded-2xl border border-slate-700/80 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">STEP 2</span>
              <Radio className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-semibold text-sm text-white">Meta WhatsApp Cloud API</h4>
            <p className="text-xs text-slate-400">
              Enter your Phone Number ID & Permanent Token, then configure the Meta Webhook URL.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('ai-agent')}
            className="cursor-pointer bg-slate-800/80 hover:bg-slate-800 p-5 rounded-2xl border border-slate-700/80 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">STEP 3</span>
              <Bot className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-semibold text-sm text-white">AI Agent & Playground</h4>
            <p className="text-xs text-slate-400">
              Set agent tone and system rules, then test conversations in the live AI playground.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
