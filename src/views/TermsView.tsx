import React from 'react';
import { FileText, ArrowLeft, ShieldAlert, CheckCircle2, Scale, ExternalLink } from 'lucide-react';
import { Footer } from '../components/Footer';

interface TermsViewProps {
  onNavigate?: (path: string) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onNavigate }) => {
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
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* Document Title Banner */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center border border-blue-100">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
              <p className="text-xs text-slate-500 mt-1">
                Agreement governing your use of Fishcatch WhatsApp Business Integration Tool
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div><strong>Effective Date:</strong> August 13, 2026</div>
            <div><strong>Application URL:</strong> <a href="https://whatsapp-api-tool2.vercel.app" target="_blank" rel="noreferrer" className="text-cyan-600 font-mono hover:underline">https://whatsapp-api-tool2.vercel.app</a></div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xs space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <span>Acceptance of Terms</span>
            </h2>
            <p>
              By accessing or using <strong>Fishcatch WhatsApp Platform</strong> (available at{' '}
              <a href="https://whatsapp-api-tool2.vercel.app" className="text-cyan-600 font-mono underline">https://whatsapp-api-tool2.vercel.app</a>), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform or connect your WhatsApp Business account.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <span>Service Description</span>
            </h2>
            <p>
              Fishcatch provides a cloud-based WhatsApp API management interface enabling businesses to connect their Meta WhatsApp Business Accounts (WABA), receive incoming customer webhooks, organize lead conversations, send automated messages via AI, and manage sales pipelines.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <span>Meta & WhatsApp Policy Compliance</span>
            </h2>
            <p>
              Your usage of our service must strictly comply with all official Meta policies and guidelines, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>WhatsApp Business Terms of Service:</strong> Compliance with official messaging requirements and user consent rules.</li>
              <li><strong>WhatsApp Commerce & Business Policies:</strong> Prohibition of prohibited goods, illegal services, and fraudulent activities.</li>
              <li><strong>Anti-Spam Regulations:</strong> You agree not to send unsolicited bulk messaging, unauthorized marketing spam, or offensive content to individuals who have not explicitly opted in to receive WhatsApp communications from your business.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">4</span>
              <span>User Responsibilities & Account Security</span>
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account password, API credentials, and Meta access tokens. You are solely responsible for all activities that occur under your account.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">5</span>
              <span>Prohibited Activities</span>
            </h2>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <ShieldAlert className="w-4 h-4" />
                <span>Zero Tolerance Policy</span>
              </div>
              <p>Users are strictly prohibited from:</p>
              <ul className="list-disc pl-5 space-y-1 text-rose-800">
                <li>Sending unsolicited bulk sales messages or spam via WhatsApp.</li>
                <li>Impersonating individuals, organizations, or government entities.</li>
                <li>Distributing malware, phishing URLs, or deceptive content.</li>
                <li>Attempting to bypass safety controls, rate limits, or administrative pauses.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">6</span>
              <span>Disclaimers & Limitation of Liability</span>
            </h2>
            <p>
              The platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. Fishcatch is not responsible for Meta Graph API outages, account suspensions enacted directly by Meta for policy non-compliance, or third-party network interruptions.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">7</span>
              <span>Contact Information</span>
            </h2>
            <p>If you have questions regarding these Terms of Service, please reach out to our team:</p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div><strong>Platform:</strong> Fishcatch WhatsApp Integration Tool</div>
              <div><strong>Domain:</strong> <a href="https://whatsapp-api-tool2.vercel.app" className="text-cyan-600 font-mono hover:underline">https://whatsapp-api-tool2.vercel.app</a></div>
              <div><strong>Contact Email:</strong> <a href="mailto:support@whatsapp-api-tool2.vercel.app" className="text-cyan-600 font-mono hover:underline">support@whatsapp-api-tool2.vercel.app</a></div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="light" onNavigate={onNavigate} />
    </div>
  );
};
