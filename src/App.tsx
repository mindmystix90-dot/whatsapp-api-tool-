import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { ConversationsView } from './views/ConversationsView';
import { LeadsView } from './views/LeadsView';
import { AIAgentView } from './views/AIAgentView';
import { WhatsAppView } from './views/WhatsAppView';
import { SettingsView } from './views/SettingsView';
import { SafetyCenterView } from './views/SafetyCenterView';
import { AdminView } from './views/AdminView';
import { AuthView } from './views/AuthView';
import { Fish } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

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
    return <AuthView />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
          {activeTab === 'conversations' && <ConversationsView />}
          {activeTab === 'leads' && <LeadsView setActiveTab={setActiveTab} />}
          {activeTab === 'ai-agent' && <AIAgentView />}
          {activeTab === 'whatsapp' && <WhatsAppView />}
          {activeTab === 'safety' && <SafetyCenterView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && user.role === 'admin' && <AdminView />}
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
