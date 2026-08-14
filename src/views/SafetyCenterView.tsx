import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserX,
  MessageSquare,
  FileText
} from 'lucide-react';

export const SafetyCenterView: React.FC = () => {
  const { fetchWithAuth } = useAuth();

  const [safetySettings, setSafetySettings] = useState({
    ai_enabled: true,
    human_takeover_on_opt_out: true,
    max_ai_replies_per_conversation: 15,
    enforce_24h_window: true,
    auto_opt_out_keywords: ['STOP', 'UNSUBSCRIBE', 'REMOVE ME', 'DO NOT MESSAGE', 'NO MORE MESSAGES'],
    safety_pause_on_error_threshold: 5
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal for new template
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'UTILITY',
    language: 'en_US',
    header_text: '',
    body_text: '',
    footer_text: ''
  });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [safetyRes, tmplRes] = await Promise.all([
        fetchWithAuth('/api/settings/whatsapp-safety'),
        fetchWithAuth('/api/whatsapp/templates')
      ]);

      if (safetyRes.ok) {
        const sData = await safetyRes.json();
        if (sData.safetySettings) {
          setSafetySettings(sData.safetySettings);
        }
      }

      if (tmplRes.ok) {
        const tData = await tmplRes.json();
        setTemplates(tData.templates || []);
      }
    } catch (err) {
      console.error('Error loading safety data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSafetySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetchWithAuth('/api/settings/whatsapp-safety', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safetySettings)
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving safety settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const cleanKw = newKeyword.trim().toUpperCase();
    if (!safetySettings.auto_opt_out_keywords.includes(cleanKw)) {
      setSafetySettings({
        ...safetySettings,
        auto_opt_out_keywords: [...safetySettings.auto_opt_out_keywords, cleanKw]
      });
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setSafetySettings({
      ...safetySettings,
      auto_opt_out_keywords: safetySettings.auto_opt_out_keywords.filter((kw) => kw !== kwToRemove)
    });
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.body_text.trim()) return;

    setCreatingTemplate(true);
    try {
      const res = await fetchWithAuth('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm)
      });

      if (res.ok) {
        setShowTemplateModal(false);
        setTemplateForm({
          name: '',
          category: 'UTILITY',
          language: 'en_US',
          header_text: '',
          body_text: '',
          footer_text: ''
        });
        loadData();
      }
    } catch (err) {
      console.error('Error creating template:', err);
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/whatsapp/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading WhatsApp Safety & Compliance Center...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Safety Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Opt-in compliance, 24-hour messaging window enforcement, Meta templates, and AI safety rules.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">Quality Health</span>
            <p className="text-lg font-bold text-emerald-700">GREEN (Healthy)</p>
            <p className="text-[11px] text-slate-500">Low complaint rate</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">24-Hour Policy</span>
            <p className="text-lg font-bold text-slate-800">ENFORCED</p>
            <p className="text-[11px] text-slate-500">Freeform messages inside 24h</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">Opt-Out Keywords</span>
            <p className="text-lg font-bold text-slate-800">{safetySettings.auto_opt_out_keywords.length} Active</p>
            <p className="text-[11px] text-slate-500">Auto human handoff</p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSafetySettings} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b pb-3">Automation & Safety Rules</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="ai_enabled"
              checked={safetySettings.ai_enabled}
              onChange={(e) => setSafetySettings({ ...safetySettings, ai_enabled: e.target.checked })}
              className="mt-1 w-4 h-4 text-cyan-600 rounded border-slate-300"
            />
            <div>
              <label htmlFor="ai_enabled" className="text-sm font-semibold text-slate-800">
                Enable AI Auto-Replies
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically reply to incoming customer messages when within the 24-hour service window.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="human_takeover_on_opt_out"
              checked={safetySettings.human_takeover_on_opt_out}
              onChange={(e) => setSafetySettings({ ...safetySettings, human_takeover_on_opt_out: e.target.checked })}
              className="mt-1 w-4 h-4 text-cyan-600 rounded border-slate-300"
            />
            <div>
              <label htmlFor="human_takeover_on_opt_out" className="text-sm font-semibold text-slate-800">
                Auto Human Handoff on Opt-Out Keyword
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch conversation mode to HUMAN immediately when customer sends STOP or opt-out keywords.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Max AI Replies Per Conversation
            </label>
            <input
              type="number"
              value={safetySettings.max_ai_replies_per_conversation}
              onChange={(e) =>
                setSafetySettings({
                  ...safetySettings,
                  max_ai_replies_per_conversation: parseInt(e.target.value) || 10
                })
              }
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Prevents infinite AI messaging loops.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Consecutive Error Pause Threshold
            </label>
            <input
              type="number"
              value={safetySettings.safety_pause_on_error_threshold}
              onChange={(e) =>
                setSafetySettings({
                  ...safetySettings,
                  safety_pause_on_error_threshold: parseInt(e.target.value) || 5
                })
              }
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Pauses AI automation if Meta API returns consecutive errors.
            </p>
          </div>
        </div>

        {/* Opt-Out Keywords Management */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Opt-Out Keywords (Trigger immediate stop)
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. UNSUBSCRIBE, STOP"
              className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              Add Keyword
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {safetySettings.auto_opt_out_keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-slate-400 hover:text-rose-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving Rules...' : 'Save Safety Rules'}
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Safety settings saved successfully!</span>
          </div>
        )}
      </form>

      {/* Meta WhatsApp Message Templates Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Approved Meta WhatsApp Templates</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Required for initiating conversations outside the 24-hour customer service window.
            </p>
          </div>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-cyan-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No WhatsApp Templates Configured</p>
            <p className="text-xs text-slate-500 mt-1">
              Add templates to reach out to leads outside the 24-hour window.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{tmpl.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {tmpl.status || 'APPROVED'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic font-sans bg-white p-2.5 rounded border border-slate-100">
                  "{tmpl.body_text}"
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>
                    Category: {tmpl.category} ({tmpl.language})
                  </span>
                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="text-rose-500 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Create WhatsApp Message Template</h3>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Name (snake_case)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. lead_followup_reminder"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="UTILITY">UTILITY</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
                  <select
                    value={templateForm.language}
                    onChange={(e) => setTemplateForm({ ...templateForm, language: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="en_US">English (US)</option>
                    <option value="es">Spanish</option>
                    <option value="pt_BR">Portuguese (BR)</option>
                    <option value="id">Indonesian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Body Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Hi {{1}}, thanks for inquiring about {{2}}! Are you available for a quick chat today?"
                  value={templateForm.body_text}
                  onChange={(e) => setTemplateForm({ ...templateForm, body_text: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTemplate}
                  className="px-5 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50"
                >
                  {creatingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
