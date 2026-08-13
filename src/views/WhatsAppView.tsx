import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { WhatsAppConnection, WhatsAppConnectionStatus } from '../types';
import {
  MessageCircleCode,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Copy,
  Check,
  RefreshCw,
  Send,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const WhatsAppView: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('https://whatsapp-api-tool2.vercel.app/api/whatsapp/webhook');
  const [hasToken, setHasToken] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    meta_app_id: '',
    waba_id: '',
    phone_number_id: '',
    access_token: '',
    webhook_verify_token: 'fishcatch_verify_token_123'
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [verifyMsg, setVerifyMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Copy buttons state
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Test WhatsApp message state
  const [testPhone, setTestPhone] = useState<string>('');
  const [testText, setTestText] = useState<string>('Hello from Fishcatch AI WhatsApp Platform!');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);

  // Guide accordion toggle
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const loadWhatsAppConfig = async () => {
    try {
      const res = await fetchWithAuth('/api/whatsapp');
      if (res.ok) {
        const data = await res.json();
        setConnection(data.connection);
        setWebhookUrl(data.webhook_url);
        setHasToken(data.has_access_token);

        if (data.connection) {
          setFormData({
            meta_app_id: data.connection.meta_app_id || '',
            waba_id: data.connection.waba_id || '',
            phone_number_id: data.connection.phone_number_id || '',
            access_token: data.connection.access_token || '',
            webhook_verify_token: data.connection.webhook_verify_token || 'fishcatch_verify_token_123'
          });
        }
      }
    } catch (err) {
      console.error('Failed to load WhatsApp config:', err);
    }
  };

  useEffect(() => {
    loadWhatsAppConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetchWithAuth('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSaveSuccess(true);
        loadWhatsAppConfig();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCredentials = async () => {
    setVerifying(true);
    setVerifyMsg(null);

    try {
      const res = await fetchWithAuth('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          const rawText = await res.text();
          data = { error: rawText || `HTTP ${res.status} returned non-JSON response` };
        }
      } else {
        const rawText = await res.text();
        data = { error: rawText || `HTTP ${res.status} returned non-JSON response` };
      }

      if (res.ok && data.success) {
        setVerifyMsg({
          success: true,
          text: `Verified successfully! Phone: ${data.phone_number || ''} (${data.display_name || ''})`
        });
      } else {
        setVerifyMsg({
          success: false,
          text: data.error || 'Failed to verify WhatsApp credentials'
        });
      }
      loadWhatsAppConfig();
    } catch (err: any) {
      setVerifyMsg({
        success: false,
        text: err.message || 'Error verifying credentials'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testText.trim() || sendingTest) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetchWithAuth('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientPhone: testPhone.trim(), messageBody: testText.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          text: `Test message sent! Message ID: ${data.wa_message_id}`
        });
      } else {
        setTestResult({
          success: false,
          text: data.error || 'Failed to send test message'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        text: err.message || 'Error sending test message'
      });
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const getStatusDisplay = () => {
    const status = connection?.status || 'Not Connected';
    if (status === 'Connected') {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">Official WhatsApp API Connected</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Phone Number: {connection?.phone_number || 'Verified'} {connection?.display_name ? `(${connection.display_name})` : ''}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full font-semibold">
            STATUS: CONNECTED
          </span>
        </div>
      );
    }

    if (status === 'Connection Error') {
      return (
        <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900">WhatsApp Connection Error</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                {connection?.error_message || 'Meta Graph API rejects credentials or Phone Number ID.'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-rose-600 bg-rose-100 px-3 py-1 rounded-full font-semibold">
            STATUS: ERROR
          </span>
        </div>
      );
    }

    return (
      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">WhatsApp API Not Connected</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Enter your Meta Cloud API Phone Number ID & Access Token below to connect.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-amber-600 bg-amber-100 px-3 py-1 rounded-full font-semibold">
          NOT CONNECTED
        </span>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Status Card */}
      {getStatusDisplay()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: API Credentials Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <MessageCircleCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Meta WhatsApp Cloud API Credentials
                  </h3>
                  <p className="text-xs text-slate-500">Official Graph API v21.0</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Meta App ID</label>
                  <input
                    type="text"
                    value={formData.meta_app_id}
                    onChange={(e) => setFormData({ ...formData, meta_app_id: e.target.value })}
                    placeholder="e.g., 102938475610293"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp Business Account ID (WABA ID)</label>
                  <input
                    type="text"
                    value={formData.waba_id}
                    onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
                    placeholder="e.g., 9876543210987"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone_number_id}
                  onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                  placeholder="e.g., 543210987654321"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  System User Access Token (Permanent Token) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.access_token}
                  onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                  placeholder={hasToken ? '•••••••••••••••• (Saved. Type to replace)' : 'EAAG...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Webhook Verify Token
                </label>
                <input
                  type="text"
                  value={formData.webhook_verify_token}
                  onChange={(e) => setFormData({ ...formData, webhook_verify_token: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Config saved!</span>
                </span>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={handleVerifyCredentials}
                  disabled={verifying}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                  <span>{verifying ? 'Testing...' : 'Test & Verify Credentials'}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all shadow-xs"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>

            {verifyMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  verifyMsg.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {verifyMsg.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{verifyMsg.text}</span>
              </div>
            )}
          </form>

          {/* Test WhatsApp Message Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-600" />
              <span>Send Test WhatsApp Message</span>
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Verify that real WhatsApp messages reach your personal phone using your connected Meta credentials.
            </p>

            <form onSubmit={handleSendTestMessage} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Recipient Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  placeholder="e.g., +15550192831 or 919876543210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Message Text</label>
                <input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest || connection?.status !== 'Connected'}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'Sending via Meta API...' : 'Send Test WhatsApp Message'}</span>
              </button>
            </form>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{testResult.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Webhook Integration Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-md space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Meta Webhook Settings
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure this Webhook URL in your Meta Developer Console under <strong>WhatsApp &gt; Configuration &gt; Webhook</strong> to route incoming customer WhatsApp messages into Fishcatch.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Webhook Callback URL
                </label>
                <div className="flex items-center gap-2 bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                  <span className="font-mono text-cyan-300 text-[11px] truncate flex-1">
                    {webhookUrl || 'Loading Webhook URL...'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(webhookUrl, 'url')}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg shrink-0 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Webhook Verify Token
                </label>
                <div className="flex items-center gap-2 bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                  <span className="font-mono text-slate-200 text-[11px] truncate flex-1">
                    {formData.webhook_verify_token}
                  </span>
                  <button
                    onClick={() => copyToClipboard(formData.webhook_verify_token, 'token')}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg shrink-0 transition-colors"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white">Subscribe to Webhook Fields:</p>
                <p className="text-slate-400">• check <strong>messages</strong> field in Meta Webhook configuration.</p>
              </div>
            </div>
          </div>

          {/* Meta Cloud API Guide Accordion */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-cyan-600" />
                <span className="text-sm font-bold text-slate-800">
                  Meta Developer Setup Guide
                </span>
              </div>
              {showGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showGuide && (
              <div className="p-5 pt-0 border-t border-slate-100 text-xs text-slate-600 space-y-3 leading-relaxed">
                <ol className="list-decimal list-inside space-y-2 font-normal">
                  <li>
                    Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-cyan-600 font-semibold underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> and create a <strong>Business</strong> type App.
                  </li>
                  <li>
                    Add <strong>WhatsApp</strong> product to your App.
                  </li>
                  <li>
                    Copy your <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong> from <em>WhatsApp &gt; API Setup</em>.
                  </li>
                  <li>
                    Under <em>WhatsApp &gt; Configuration</em>, click <strong>Edit</strong> on Webhook. Paste the Callback URL and Verify Token above.
                  </li>
                  <li>
                    Subscribe to the <strong>messages</strong> webhook field.
                  </li>
                  <li>
                    Create a Permanent System User Token in Business Settings with <code>whatsapp_business_messaging</code> permission.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
