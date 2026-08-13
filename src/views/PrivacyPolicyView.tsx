import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, Database, UserCheck, Trash2, Mail, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Footer } from '../components/Footer';

interface PrivacyPolicyViewProps {
  onNavigate?: (path: string) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
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
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Public Policy</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* Document Title Banner */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-50 text-cyan-700 rounded-2xl flex items-center justify-center border border-cyan-100">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-slate-500 mt-1">
                Official Privacy Notice for WhatsApp API Tool & Fishcatch Platform
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
              <span>Overview & Scope</span>
            </h2>
            <p>
              This Privacy Policy explains how <strong>WhatsApp API Tool</strong> (operating under the Fishcatch Platform at{' '}
              <a href="https://whatsapp-api-tool2.vercel.app" className="text-cyan-600 font-mono underline">https://whatsapp-api-tool2.vercel.app</a>) collects, uses, stores, and protects personal data and Meta WhatsApp Business API information.
            </p>
            <p>
              We are committed to maintaining strict data confidentiality, safeguarding customer communications, and fully respecting Meta’s WhatsApp Business Terms and Platform Policies.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <span>Information We Collect</span>
            </h2>
            <p>We collect only the necessary data required to facilitate automated WhatsApp messaging, lead management, and customer support:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>
                <strong>Account & Business Credentials:</strong> Name, email address, password hashes, and business entity name when registering an account.
              </li>
              <li>
                <strong>Meta WhatsApp Business Integration Data:</strong> WhatsApp Business Account ID (WABA ID), Phone Number ID, display phone numbers, verified business names, quality ratings, and system user access tokens provided directly or via Meta Embedded Signup.
              </li>
              <li>
                <strong>WhatsApp Message & Conversation Data:</strong> Inbound and outbound WhatsApp messages, customer phone numbers, contact display names, message timestamps, delivery statuses, and lead tags processed via Webhooks.
              </li>
              <li>
                <strong>Technical Logs:</strong> IP address, browser user-agent, and server error logs maintained strictly for debugging and security auditing.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <span>How We Use Your Information</span>
            </h2>
            <p>Your data is processed strictly for legitimate operational purposes:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                  <Database className="w-4 h-4 text-cyan-600" />
                  <span>WhatsApp Cloud API Service</span>
                </div>
                <p className="text-xs text-slate-600">
                  Sending and receiving customer messages through official Meta Cloud API endpoints on your behalf.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Lead Management & CRM</span>
                </div>
                <p className="text-xs text-slate-600">
                  Organizing incoming WhatsApp customer inquiries into actionable sales leads and automated AI responses.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">4</span>
              <span>Data Sharing & Third Parties</span>
            </h2>
            <p className="font-semibold text-slate-800">
              We DO NOT sell, rent, or trade your personal or business data to third parties under any circumstances.
            </p>
            <p>We share data exclusively with trusted service providers necessary to operate the application:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li><strong>Meta Platforms, Inc.:</strong> Data transmitted directly via the Meta WhatsApp Cloud API for message delivery.</li>
              <li><strong>Google Cloud Platform / Cloud Run / Vercel:</strong> Secure server hosting and infrastructure services located at <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-cyan-700">https://whatsapp-api-tool2.vercel.app</code>.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">5</span>
              <span>Data Security & Access Controls</span>
            </h2>
            <p>
              We enforce robust security measures to protect your credentials and conversation logs:
            </p>
            <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Security Standards</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>HTTPS / TLS 1.3 encryption for all data in transit.</li>
                <li>Hashed and salted user authentication credentials.</li>
                <li>Masked API tokens in client user interfaces.</li>
                <li>Strict multi-tenant database isolation by Business ID.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 - Meta Data Deletion */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">6</span>
              <span>User Rights & Meta Data Deletion Instructions</span>
            </h2>
            <p>
              You retain full rights to access, export, or request permanent deletion of your stored data and WhatsApp Business integration credentials.
            </p>
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Trash2 className="w-4 h-4 text-amber-600" />
                <span>How to Request Data Deletion</span>
              </div>
              <ol className="list-decimal pl-5 space-y-2 text-xs leading-relaxed">
                <li>
                  <strong>Disconnect WhatsApp Account:</strong> Navigate to the <em>WhatsApp Integration</em> view inside the app and click <strong>Disconnect WhatsApp</strong> to revoke access tokens immediately.
                </li>
                <li>
                  <strong>Meta App Settings Deletion:</strong> If you connected via Meta Embedded Signup or Facebook Login, go to your <strong>Facebook User Settings &gt; Apps and Websites</strong>, find <strong>Fishcatch WhatsApp Tool</strong>, and click <strong>Remove</strong>. Meta will trigger an automated callback to our endpoint at <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">https://whatsapp-api-tool2.vercel.app/api/whatsapp/data-deletion</code>.
                </li>
                <li>
                  <strong>Direct Support Deletion Request:</strong> Email us at <a href="mailto:support@whatsapp-api-tool2.vercel.app" className="font-semibold underline">support@whatsapp-api-tool2.vercel.app</a> or visit our <a href="/data-deletion" className="font-semibold underline">Data Deletion Status Page</a> to request complete erasure of your business account.
                </li>
              </ol>
            </div>
          </section>

          {/* Section 7 - Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">7</span>
              <span>Contact Information</span>
            </h2>
            <p>For privacy inquiries, data deletion requests, or Meta compliance questions, please contact our Data Protection Officer:</p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div><strong>Application Name:</strong> Fishcatch WhatsApp Platform</div>
              <div><strong>Domain:</strong> <a href="https://whatsapp-api-tool2.vercel.app" className="text-cyan-600 font-mono hover:underline">https://whatsapp-api-tool2.vercel.app</a></div>
              <div><strong>Support Email:</strong> <a href="mailto:support@whatsapp-api-tool2.vercel.app" className="text-cyan-600 font-mono hover:underline">support@whatsapp-api-tool2.vercel.app</a></div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="light" onNavigate={onNavigate} />
    </div>
  );
};
