import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { AISettings } from '../types.js';
import {
  Bot,
  Save,
  Play,
  Sparkles,
  Check,
  AlertCircle,
  MessageSquare,
  Sliders,
  Send
} from 'lucide-react';

export const AIAgentView: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const [settings, setSettings] = useState<AISettings>({
    id: '',
    business_id: '',
    enabled: true,
    agent_name: 'Lead AI Assistant',
    system_instructions: 'Help customers, answer product questions, and guide them to convert.',
    tone: 'Friendly & Professional',
    language_preference: 'Match Customer Language',
    human_handoff_rules: 'Handoff if customer requests human agent or complex issue.',
    created_at: '',
    updated_at: ''
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Playground state
  const [testPrompt, setTestPrompt] = useState<string>('');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [testError, setTestError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/ai-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.aiSettings) setSettings(data.aiSettings);
      }
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetchWithAuth('/api/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save AI settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim() || testing) return;

    setTesting(true);
    setTestError(null);
    setTestResponse(null);

    try {
      const res = await fetchWithAuth('/api/ai-settings/test-playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPrompt: testPrompt.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setTestError(data.error || 'Failed to generate AI response');
      } else {
        setTestResponse(data.reply);
      }
    } catch (err: any) {
      setTestError(err.message || 'Error running AI playground test');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Config Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    AI Agent Configuration
                  </h3>
                  <p className="text-xs text-slate-500">Gemini 3.6 Flash Server Engine</p>
                </div>
              </div>

              {/* Master AI Enable Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-700">
                  {settings.enabled ? 'AI Enabled' : 'AI Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5 accent-cyan-600 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Agent Name</label>
                <input
                  type="text"
                  value={settings.agent_name}
                  onChange={(e) => setSettings({ ...settings, agent_name: e.target.value })}
                  placeholder="e.g., Fishcatch AI Sales Assistant"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tone & Persona</label>
                  <select
                    value={settings.tone}
                    onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
                  >
                    <option value="Friendly & Professional">Friendly & Professional</option>
                    <option value="Consultative Sales">Consultative Sales</option>
                    <option value="Direct & Concise">Direct & Concise</option>
                    <option value="High Energy & Enthusiastic">High Energy & Enthusiastic</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Language Support</label>
                  <select
                    value={settings.language_preference}
                    onChange={(e) => setSettings({ ...settings, language_preference: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
                  >
                    <option value="Match Customer Language">Match Customer Language (Auto)</option>
                    <option value="English Only">English Only</option>
                    <option value="Hinglish & English">Hinglish & English</option>
                    <option value="Hindi & English">Hindi & English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">System Instructions & Behavior</label>
                <textarea
                  rows={4}
                  value={settings.system_instructions}
                  onChange={(e) => setSettings({ ...settings, system_instructions: e.target.value })}
                  placeholder="Describe how the AI should introduce itself, answer customer questions, handle pricing inquiries, and guide leads to convert..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Human Handoff Rules</label>
                <textarea
                  rows={2}
                  value={settings.human_handoff_rules}
                  onChange={(e) => setSettings({ ...settings, human_handoff_rules: e.target.value })}
                  placeholder="Specify when the AI should stop auto-replying or suggest talking to a human..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>AI settings saved!</span>
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save AI Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Gemini AI Playground (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live AI Playground
                </h3>
              </div>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                GEMINI 3.6 FLASH
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Test how your AI Agent responds to sample WhatsApp messages using your business profile knowledge before talking to real customers.
            </p>

            <form onSubmit={handleRunTest} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Sample Customer WhatsApp Message
                </label>
                <input
                  type="text"
                  placeholder="e.g., Hi! What are your prices and business hours?"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={testing || !testPrompt.trim()}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{testing ? 'Gemini Thinking...' : 'Test AI Response'}</span>
              </button>
            </form>

            {/* Test Results Output Box */}
            {testError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{testError}</span>
              </div>
            )}

            {testResponse && (
              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  AI Agent Reply Output:
                </span>
                <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {testResponse}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
