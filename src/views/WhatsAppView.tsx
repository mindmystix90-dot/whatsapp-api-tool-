import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { WhatsAppConnection } from '../types';
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
  ChevronUp,
  LogOut,
  Phone,
  Sparkles,
  Lock,
  Building2,
  Sliders,
  Terminal
} from 'lucide-react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

const META_APP_ID = '3356483501181888';
const EMBEDDED_CONFIG_ID = '2934849833375100';

export const WhatsAppView: React.FC = () => {
  const { fetchWithAuth } = useAuth();

  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<WhatsAppConnection | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('https://whatsapp-api-tool2.vercel.app/api/whatsapp/webhook');
  const [hasToken, setHasToken] = useState<boolean>(false);

  // Embedded Signup State Machine
  const [oauthCode, setOauthCode] = useState<string | null>(null);
  const [signupData, setSignupData] = useState<{ phone_number_id?: string; waba_id?: string; business_id?: string } | null>(null);
  const [connectingFb, setConnectingFb] = useState<boolean>(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbDebugError, setFbDebugError] = useState<string | null>(null);
  const [fbSuccess, setFbSuccess] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Advanced / Manual Section Toggle
  const [showManualSection, setShowManualSection] = useState<boolean>(false);

  // Manual Form Data State
  const [formData, setFormData] = useState({
    meta_app_id: META_APP_ID,
    waba_id: '',
    phone_number_id: '',
    access_token: '',
    webhook_verify_token: 'fishcatch_verify_token_123'
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  // Ref to prevent double-submitting embedded signup payload
  const isSubmittingRef = useRef<boolean>(false);

  const loadWhatsAppConfig = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/whatsapp');
      if (res.ok) {
        const data = await res.json();
        const connList: WhatsAppConnection[] = data.connections || (data.connection ? [data.connection] : []);
        setConnections(connList);
        const primaryConn = data.connection || connList[0] || null;
        setActiveConnection(primaryConn);

        if (data.webhook_url) setWebhookUrl(data.webhook_url);
        setHasToken(data.has_access_token);

        if (primaryConn) {
          setFormData({
            meta_app_id: primaryConn.meta_app_id || META_APP_ID,
            waba_id: primaryConn.waba_id || '',
            phone_number_id: primaryConn.phone_number_id || '',
            access_token: primaryConn.access_token ? '••••••••••••••••' : '',
            webhook_verify_token: primaryConn.webhook_verify_token || 'fishcatch_verify_token_123'
          });
        }
      }
    } catch (err) {
      console.error('Failed to load WhatsApp config:', err);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadWhatsAppConfig();
  }, [loadWhatsAppConfig]);

  // Load Facebook JavaScript SDK
  useEffect(() => {
    if (window.FB) {
      try {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v25.0'
        });
      } catch (e) {
        // Ignored if already initialized
      }
      return;
    }

    window.fbAsyncInit = function () {
      if (window.FB) {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v25.0'
        });
      }
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  // Handle Meta Embedded Signup postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 1. Meta Embedded Signup session event
      if (event.origin === 'https://www.facebook.com' || event.origin === 'https://web.facebook.com') {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
            console.log('[WhatsApp Embedded Signup] postMessage event received:', data.event);
            if (data.event === 'FINISH') {
              const { phone_number_id, waba_id, business_id } = data.data || {};
              console.log('[WhatsApp Embedded Signup]\nWABA ID:', waba_id || 'N/A');
              console.log('[WhatsApp Embedded Signup]\nPhone Number ID:', phone_number_id || 'N/A');
              setSignupData({ phone_number_id, waba_id, business_id });
            } else if (data.event === 'CANCEL') {
              setFbError('WhatsApp onboarding was not completed.');
              setConnectingFb(false);
            } else if (data.event === 'ERROR') {
              setFbError('WhatsApp onboarding failed.');
              setFbDebugError(data.data?.error_message || 'Embedded signup event reported an error.');
              setConnectingFb(false);
            }
          }
        } catch (e) {
          // Ignore non-JSON postMessage
        }
      }

      // 2. OAuth Callback Popup postMessage fallback
      if (event.data && event.data.type === 'WA_OAUTH_RESPONSE') {
        if (event.data.success && event.data.code) {
          console.log('[WhatsApp Embedded Signup]\nOAuth code received: YES');
          setOauthCode(event.data.code);
        } else {
          setFbError('Facebook authorization failed.');
          setFbDebugError(event.data.error || 'OAuth response failed.');
          setConnectingFb(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Embedded Signup Backend Dispatcher
  const submitEmbeddedSignup = useCallback(async (codeVal?: string | null, signupVal?: typeof signupData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setConnectingFb(true);
    setFbError(null);
    setFbDebugError(null);

    try {
      const payload = {
        code: codeVal || oauthCode || undefined,
        phone_number_id: signupVal?.phone_number_id || signupData?.phone_number_id || undefined,
        waba_id: signupVal?.waba_id || signupData?.waba_id || undefined,
        business_id: signupVal?.business_id || signupData?.business_id || undefined,
        meta_app_id: META_APP_ID
      };

      const res = await fetchWithAuth('/api/whatsapp/embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setFbSuccess('WhatsApp connected successfully!');
        await loadWhatsAppConfig();
      } else {
        if (data.error?.includes('access token') || data.error?.includes('code')) {
          setFbError('Could not complete Meta authorization.');
        } else if (data.error?.includes('WABA')) {
          setFbError('WhatsApp Business Account setup failed.');
        } else if (data.error?.includes('register') || data.error?.includes('phone')) {
          setFbError('Phone number registration failed.');
        } else {
          setFbError('WhatsApp onboarding was not completed.');
        }
        setFbDebugError(data.error || 'Unknown error occurred during onboarding.');
      }
    } catch (err: any) {
      setFbError('WhatsApp onboarding was not completed.');
      setFbDebugError(err.message || String(err));
    } finally {
      setConnectingFb(false);
      isSubmittingRef.current = false;
    }
  }, [fetchWithAuth, loadWhatsAppConfig, oauthCode, signupData]);

  // Race-Condition Collector Effect
  useEffect(() => {
    if (oauthCode && signupData && !isSubmittingRef.current) {
      submitEmbeddedSignup(oauthCode, signupData);
    }
  }, [oauthCode, signupData, submitEmbeddedSignup]);

  // Launch Meta Official Embedded Signup
  const handleLaunchFacebookSignup = () => {
    setConnectingFb(true);
    setFbError(null);
    setFbDebugError(null);
    setFbSuccess(null);
    setOauthCode(null);
    setSignupData(null);
    isSubmittingRef.current = false;

    // Call FB.login using Official Facebook JavaScript SDK
    if (window.FB) {
      try {
        window.FB.login(
          (response: any) => {
            if (response.authResponse?.code) {
              console.log('[WhatsApp Embedded Signup]\nOAuth code received: YES');
              setOauthCode(response.authResponse.code);
              // In case WA_EMBEDDED_SIGNUP message arrives later, state machine will trigger.
              // If WA_EMBEDDED_SIGNUP message is not sent in this flow version, fallback trigger in 3s:
              setTimeout(() => {
                if (!isSubmittingRef.current) {
                  submitEmbeddedSignup(response.authResponse.code, null);
                }
              }, 3000);
            } else {
              setFbError('Facebook authorization failed.');
              setConnectingFb(false);
            }
          },
          {
            config_id: EMBEDDED_CONFIG_ID,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: 'whatsapp_embedded_signup'
            }
          }
        );
        return;
      } catch (err: any) {
        console.warn('FB.login exception:', err);
      }
    }

    // Popup Fallback if FB SDK not available or popups blocked
    fetchWithAuth(`/api/whatsapp/oauth/start?app_id=${META_APP_ID}`)
      .then((r) => r.json())
      .then((startData) => {
        if (startData.oauth_url) {
          const width = 600;
          const height = 700;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          window.open(startData.oauth_url, 'MetaWhatsAppSignup', `width=${width},height=${height},left=${left},top=${top}`);
        } else {
          setFbError('Facebook authorization failed.');
          setConnectingFb(false);
        }
      })
      .catch((err) => {
        setFbError('Facebook authorization failed.');
        setFbDebugError(err.message || String(err));
        setConnectingFb(false);
      });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetchWithAuth('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const raw = await res.text();
        data = { error: raw || `HTTP ${res.status}` };
      }

      if (res.ok && data.success !== false) {
        setSaveSuccess(true);
        await loadWhatsAppConfig();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      console.error('Failed to save config:', err);
      setSaveError(err.message || 'Error saving configuration.');
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
        data = await res.json().catch(() => ({}));
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
      await loadWhatsAppConfig();
    } catch (err: any) {
      setVerifyMsg({
        success: false,
        text: err.message || 'Error verifying credentials'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisconnect = async (connId?: string) => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp account?')) return;
    setDisconnectingId(connId || 'all');
    try {
      const res = await fetchWithAuth('/api/whatsapp/disconnect', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setVerifyMsg(null);
        setTestResult(null);
        setSaveSuccess(false);
        setSaveError(null);
        setFbSuccess(null);
        setFbError(null);
      } else {
        alert(data.error || 'Failed to disconnect WhatsApp');
      }
    } catch (err: any) {
      alert(err.message || 'Error disconnecting WhatsApp');
    } finally {
      setDisconnectingId(null);
      await loadWhatsAppConfig();
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
        body: JSON.stringify({
          recipientPhone: testPhone.trim(),
          messageBody: testText.trim(),
          phone_number_id: activeConnection?.phone_number_id || formData.phone_number_id,
          access_token: activeConnection?.access_token || formData.access_token
        })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const raw = await res.text();
        data = { error: raw || `HTTP ${res.status}` };
      }

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          text: `Test message sent successfully! Message ID: ${data.wa_message_id || 'Sent'}`
        });
      } else {
        setTestResult({
          success: false,
          text: data.error || 'Failed to send test message.'
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

  const isConnected = connections.some((c) => c.status === 'Connected') || activeConnection?.status === 'Connected';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageCircleCode className="w-7 h-7 text-emerald-600" />
            <span>WhatsApp Business Integration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connect your WhatsApp Business account through Meta or configure API credentials.
          </p>
        </div>
      </div>

      {/* Main Connection Container */}
      {!isConnected ? (
        /* NOT CONNECTED STATE: Primary "Connect WhatsApp" Card */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
            <MessageCircleCode className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Connect WhatsApp</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Connect your WhatsApp Business account securely through Meta in just a few clicks.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleLaunchFacebookSignup}
              disabled={connectingFb}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1465d2] text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-3 mx-auto"
            >
              <div className="w-5 h-5 bg-white text-[#1877F2] rounded-full flex items-center justify-center font-black text-xs shrink-0">
                f
              </div>
              <span>
                {connectingFb ? 'Connecting to Facebook...' : 'Connect WhatsApp with Facebook'}
              </span>
            </button>
            <p className="text-xs text-slate-400 mt-3 font-medium">
              No manual Phone ID or Access Token required.
            </p>
          </div>

          {fbSuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{fbSuccess}</span>
            </div>
          )}

          {fbError && (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs space-y-2 text-left">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{fbError}</span>
              </div>
              {fbDebugError && (
                <div className="pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{showDebug ? 'Hide Developer Debug Logs' : 'View Developer Debug Logs'}</span>
                  </button>
                  {showDebug && (
                    <pre className="mt-2 p-2.5 bg-slate-900 text-rose-300 rounded-lg text-[10px] font-mono whitespace-pre-wrap overflow-x-auto">
                      {fbDebugError}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* CONNECTED STATE: Status Dashboard */
        <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    WhatsApp Connected
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your WhatsApp Business Account is active and linked to this application.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDisconnect(activeConnection?.id)}
              disabled={Boolean(disconnectingId)}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{disconnectingId ? 'Disconnecting...' : 'Disconnect WhatsApp'}</span>
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Phone Number</span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {activeConnection?.phone_number || activeConnection?.phone_number_id || 'Connected'}
              </p>
              {activeConnection?.display_name && (
                <p className="text-[11px] text-slate-600 font-medium truncate">
                  {activeConnection.display_name}
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">WABA ID</span>
              <p className="font-mono font-bold text-slate-900 truncate">
                {activeConnection?.waba_id || 'Meta Business Account'}
              </p>
              <span className="text-[10px] text-slate-500">Phone ID: {activeConnection?.phone_number_id}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Webhook Status</span>
              <p className="font-bold text-emerald-700 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connected</span>
              </p>
              <span className="text-[10px] text-slate-500">Receiving Messages</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">API Health</span>
              <p className="font-bold text-emerald-700 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connected</span>
              </p>
              <span className="text-[10px] text-slate-500">
                {activeConnection?.last_verified_at
                  ? new Date(activeConnection.last_verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Active'}
              </span>
            </div>
          </div>

          {/* Connected Action Tools */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Test WhatsApp Message Form */}
            <div className="md:col-span-7 bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-600" />
                <span>Send Test WhatsApp Message</span>
              </h4>

              <form onSubmit={handleSendTestMessage} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Recipient Phone Number (with Country Code)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., +15550192831 or 919876543210"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Message Text</label>
                  <input
                    type="text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTest ? 'Sending via Meta API...' : 'Send Test WhatsApp Message'}</span>
                </button>
              </form>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.success ? 'bg-emerald-100/70 text-emerald-900' : 'bg-rose-100/70 text-rose-900'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{testResult.text}</span>
                </div>
              )}
            </div>

            {/* Webhook Quick Reference */}
            <div className="md:col-span-5 bg-slate-900 text-slate-200 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Webhook Endpoints
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Callback URL</span>
                  <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <span className="font-mono text-cyan-300 text-[10px] truncate flex-1">{webhookUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookUrl, 'url')}
                      className="p-1 text-slate-300 hover:text-white shrink-0"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Verify Token</span>
                  <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <span className="font-mono text-slate-300 text-[10px] truncate flex-1">
                      {formData.webhook_verify_token}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formData.webhook_verify_token, 'token')}
                      className="p-1 text-slate-300 hover:text-white shrink-0"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced / Manual Connection Fallback (Collapsible) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowManualSection(!showManualSection)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-slate-500" />
            <div>
              <span className="text-sm font-bold text-slate-800 block">
                Advanced / Manual API Connection
              </span>
              <span className="text-xs text-slate-500">
                Manually configure Phone Number ID, WABA ID, and Permanent Access Tokens.
              </span>
            </div>
          </div>
          {showManualSection ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showManualSection && (
          <form onSubmit={handleSaveConfig} className="p-6 pt-2 border-t border-slate-100 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Meta App ID</label>
                <input
                  type="text"
                  value={formData.meta_app_id}
                  onChange={(e) => setFormData({ ...formData, meta_app_id: e.target.value })}
                  placeholder="e.g., 3356483501181888"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">WhatsApp Business Account ID (WABA ID)</label>
                <input
                  type="text"
                  value={formData.waba_id}
                  onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
                  placeholder="e.g., 9876543210987"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-mono"
                />
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
                  System User Access Token <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.access_token}
                  onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                  placeholder={hasToken ? '•••••••••••••••• (Saved)' : 'EAAG...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Configuration saved successfully!</span>
                </span>
              )}
              {saveError && (
                <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{saveError}</span>
                </span>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={handleVerifyCredentials}
                  disabled={verifying}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                  <span>{verifying ? 'Testing...' : 'Test & Verify Credentials'}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all"
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
        )}
      </div>

      {/* Meta Developer Guide Accordion */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-cyan-600" />
            <span className="text-sm font-bold text-slate-800">
              Meta Developer Setup Instructions
            </span>
          </div>
          {showGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showGuide && (
          <div className="p-5 pt-0 border-t border-slate-100 text-xs text-slate-600 space-y-3 leading-relaxed">
            <ol className="list-decimal list-inside space-y-2 font-normal">
              <li>
                Open Meta Developer Dashboard at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-cyan-600 font-semibold underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a>.
              </li>
              <li>
                Ensure your App ID (<code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px]">{META_APP_ID}</code>) has <strong>Facebook Login for Business</strong> and <strong>WhatsApp</strong> added.
              </li>
              <li>
                In <strong>Facebook Login for Business &gt; Settings</strong>, add Valid OAuth Redirect URI: <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px]">https://whatsapp-api-tool2.vercel.app/api/whatsapp/oauth/callback</code>.
              </li>
              <li>
                In <strong>WhatsApp &gt; Configuration</strong>, set Webhook Callback URL to <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px]">{webhookUrl}</code> and Verify Token to <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px]">{formData.webhook_verify_token}</code>.
              </li>
              <li>
                Click <strong>Connect WhatsApp with Facebook</strong> above to execute official Meta WhatsApp Embedded Signup onboarding.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
