import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Views
import { DashboardView } from './views/DashboardView';
import { ConversationsView } from './views/ConversationsView';
import { LeadsView } from './views/LeadsView';
import { AIAgentView } from './views/AIAgentView';
import { WhatsAppView } from './views/WhatsAppView';
import { SettingsView } from './views/SettingsView';
import { SafetyCenterView } from './views/SafetyCenterView';
import { AdminView } from './views/AdminView';
import { AuthView } from './views/AuthView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsView } from './views/TermsView';
import { DataDeletionView } from './views/DataDeletionView';

import { Fish } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Public Unauthenticated Pages (Privacy Policy, Terms of Service, Data Deletion)
  const cleanPath = currentPath.toLowerCase().split('?')[0];

  if (cleanPath === '/privacy-policy' || cleanPath === '/privacy') {
    return <PrivacyPolicyView onNavigate={navigateTo} />;
  }

  if (cleanPath === '/terms' || cleanPath === '/terms-of-service') {
    return <TermsView onNavigate={navigateTo} />;
  }

  if (cleanPath === '/data-deletion' || cleanPath === '/data-deletion-status') {
    return <DataDeletionView onNavigate={navigateTo} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 animate-bounce">
          <Fish className="w-7 h-7" />
        </div>
        <p className="text-xs font-semibold text-slate-300">Loading Fishcatch Platform...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView onNavigate={navigateTo} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="flex-1">
            {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
            {activeTab === 'conversations' && <ConversationsView />}
            {activeTab === 'leads' && <LeadsView setActiveTab={setActiveTab} />}
            {activeTab === 'ai-agent' && <AIAgentView />}
            {activeTab === 'whatsapp' && <WhatsAppView />}
            {activeTab === 'safety' && <SafetyCenterView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'admin' && user.role === 'admin' && <AdminView />}
          </div>

          <Footer variant="light" onNavigate={navigateTo} />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
