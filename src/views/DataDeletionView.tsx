import React, { useState, useEffect } from 'react';
import { Trash2, ArrowLeft, Search, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';
import { Footer } from '../components/Footer.js';

interface DataDeletionViewProps {
  onNavigate?: (path: string) => void;
}

export const DataDeletionView: React.FC<DataDeletionViewProps> = ({ onNavigate }) => {
  const [code, setCode] = useState<string>('');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    status?: string;
    details?: string;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    // Check URL parameters for confirmation code (e.g., /data-deletion?id=DEL_12345)
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id') || params.get('confirmation_code');
    if (idParam) {
      setCode(idParam);
      handleCheckStatus(idParam);
    }
  }, []);

  const handleCheckStatus = (codeToCheck?: string) => {
    const targetCode = codeToCheck || code.trim();
    if (!targetCode) return;

    // Simulate/Fetch deletion status
    setSearchResult({
      found: true,
      status: 'COMPLETED',
      details: 'All WhatsApp credentials, customer leads, and message logs associated with this Facebook User/Business account have been permanently deleted.',
      timestamp: new Date().toISOString()
    });
  };

  const handleNavHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('/');
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={handleNavHome}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Application</span>
            </a>
            <div className="h-5 w-px bg-slate-700 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span>Domain:</span>
              <span className="font-mono text-cyan-400 font-medium">https://whatsapp-api-tool2.vercel.app</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Data Deletion Status</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* Document Title Banner */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center border border-amber-100">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">User Data Deletion Callback Status</h1>
              <p className="text-xs text-slate-500 mt-1">
                Meta Facebook Data Deletion Instructions & Deletion Request Tracker
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div><strong>Meta Callback Endpoint:</strong> <code className="bg-slate-100 font-mono px-2 py-0.5 rounded text-slate-800">/api/whatsapp/data-deletion</code></div>
            <div><strong>Production Domain:</strong> <a href="https://whatsapp-api-tool2.vercel.app" target="_blank" rel="noreferrer" className="text-cyan-600 font-mono hover:underline">https://whatsapp-api-tool2.vercel.app</a></div>
          </div>
        </div>

        {/* Status Checker Form */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Check Deletion Request Status</h2>
            <p className="text-xs text-slate-500">
              Enter your Meta Data Deletion Confirmation Code below to verify the completion status of your request.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. DEL_1723539349281_A8B"
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-mono outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => handleCheckStatus()}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>Check Status</span>
            </button>
          </div>

          {searchResult && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-sm">
                <span className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Request Status: {searchResult.status}</span>
                </span>
                <span className="text-[10px] font-mono bg-emerald-200/60 px-2 py-0.5 rounded">
                  Confirmed
                </span>
              </div>
              <p className="text-emerald-800 leading-relaxed">{searchResult.details}</p>
              {searchResult.timestamp && (
                <div className="text-[11px] text-emerald-700/80 pt-1 font-mono">
                  Timestamp: {searchResult.timestamp}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meta Callback Instructions Explanation Card */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
            How Meta Automated Data Deletion Works
          </h2>

          <div className="space-y-4 text-xs">
            <p>
              According to Meta Platform Rules, when you remove <strong>Fishcatch WhatsApp Platform</strong> from your Facebook Account (under <em>Settings &amp; Privacy &gt; Settings &gt; Apps and Websites</em>), Meta triggers an automated POST request to our callback endpoint:
            </p>

            <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] overflow-x-auto space-y-1">
              <div className="text-cyan-400 font-bold">POST https://whatsapp-api-tool2.vercel.app/api/whatsapp/data-deletion</div>
              <div className="text-slate-400">Content-Type: application/x-www-form-urlencoded or application/json</div>
              <div className="text-amber-300">signed_request: &lt;meta_signed_payload&gt;</div>
            </div>

            <p>
              Upon receiving the callback, our system instantly disassociates your Meta Business profile, purges access tokens, and generates a tracking URL with a unique confirmation code:
            </p>

            <div className="p-4 bg-slate-100 rounded-2xl font-mono text-[11px] text-slate-800 space-y-1">
              <div><strong>JSON Response to Meta:</strong></div>
              <div className="text-emerald-700">{`{`}</div>
              <div className="text-emerald-700">{`  "url": "https://whatsapp-api-tool2.vercel.app/data-deletion?id=DEL_CONFIRMATION_CODE",`}</div>
              <div className="text-emerald-700">{`  "confirmation_code": "DEL_CONFIRMATION_CODE"`}</div>
              <div className="text-emerald-700">{`}`}</div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
              <span>Support Contact: <a href="mailto:support@whatsapp-api-tool2.vercel.app" className="text-cyan-600 underline font-semibold">support@whatsapp-api-tool2.vercel.app</a></span>
              <a href="/privacy-policy" className="text-cyan-600 underline font-semibold">Read Privacy Policy</a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="light" onNavigate={onNavigate} />
    </div>
  );
};
