import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminOverview, AdminBusinessOverview } from '../types';
import {
  ShieldAlert,
  Building2,
  Users,
  MessageSquare,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Search,
  PauseCircle,
  PlayCircle,
  FileText
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'businesses' | 'audit'>('businesses');
  const [pausingId, setPausingId] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      const [overviewRes, auditRes] = await Promise.all([
        fetchWithAuth('/api/admin/overview'),
        fetchWithAuth('/api/admin/audit-logs')
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.adminOverview);
      }

      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditLogs(aData.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleSafetyPause = async (businessId: string, currentPause: boolean) => {
    setPausingId(businessId);
    try {
      const res = await fetchWithAuth(`/api/admin/businesses/${businessId}/pause-safety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pause: !currentPause,
          reason: currentPause ? 'Admin manually resumed safety' : 'Emergency admin pause'
        })
      });

      if (res.ok) {
        loadAdminData();
      }
    } catch (err) {
      console.error('Failed to toggle safety pause:', err);
    } finally {
      setPausingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading platform admin metrics...</div>;
  }

  const businesses = overview?.businesses || [];
  const filteredBusinesses = businesses.filter((b) =>
    b.business_name.toLowerCase().includes(search.toLowerCase()) ||
    b.owner_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Platform Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Registered Businesses</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{overview?.total_businesses ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">SaaS tenant accounts</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Connected WhatsApps</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{overview?.connected_whatsapp_count ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Verified Meta Accounts</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Radio className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Conversations</p>
            <p className="text-2xl font-black text-cyan-600 mt-1">{overview?.total_conversations ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Platform customer chats</p>
          </div>
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Platform Leads</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{overview?.total_leads ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Captured across all tenants</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('businesses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'businesses'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tenant Businesses ({businesses.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Admin Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tenants Table */}
      {activeTab === 'businesses' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                <span>Platform Tenants & WhatsApp Safety Control</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Emergency pause AI automation for any connected business</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search business or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-cyan-500 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Business Name</th>
                  <th className="px-6 py-3.5">Owner Account</th>
                  <th className="px-6 py-3.5">WhatsApp Status</th>
                  <th className="px-6 py-3.5">WhatsApp Phone</th>
                  <th className="px-6 py-3.5 text-center">Safety Status</th>
                  <th className="px-6 py-3.5 text-center">Emergency Action</th>
                  <th className="px-6 py-3.5 text-center">Leads (Total / Converted)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.map((b) => (
                  <tr key={b.business_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{b.business_name}</td>
                    <td className="px-6 py-4 text-slate-600">{b.owner_email}</td>
                    <td className="px-6 py-4">
                      {b.whatsapp_status === 'Connected' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>{b.whatsapp_status}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">{b.whatsapp_phone || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      {b.safety_paused ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px]">
                          PAUSED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleSafetyPause(b.business_id, Boolean(b.safety_paused))}
                        disabled={pausingId === b.business_id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto transition-colors ${
                          b.safety_paused
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {b.safety_paused ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Resume AI</span>
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Pause AI</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                      {b.total_leads} <span className="text-emerald-600 font-normal">({b.converted_leads} converted)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Platform Administrative Audit Log</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Records all sensitive platform admin interventions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Admin Email</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Target Business</th>
                  <th className="px-6 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                      No admin actions recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{log.admin_email}</td>
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">{log.action}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{log.target_business_name}</td>
                      <td className="px-6 py-4 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

