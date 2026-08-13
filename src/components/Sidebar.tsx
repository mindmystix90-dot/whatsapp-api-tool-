import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Bot,
  MessageCircleCode,
  Building2,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Fish
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'dashboard' | 'conversations' | 'leads' | 'ai-agent' | 'whatsapp' | 'safety' | 'settings' | 'admin';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'conversations' as NavTab, label: 'Conversations', icon: MessageSquare },
    { id: 'leads' as NavTab, label: 'Leads', icon: Users },
    { id: 'ai-agent' as NavTab, label: 'AI Agent', icon: Bot },
    { id: 'whatsapp' as NavTab, label: 'WhatsApp API', icon: MessageCircleCode },
    { id: 'safety' as NavTab, label: 'Safety Center', icon: ShieldCheck },
    { id: 'settings' as NavTab, label: 'Business Profile', icon: Building2 }
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin' as NavTab, label: 'Platform Admin', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <Fish className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight leading-none">Fishcatch</h1>
          <p className="text-xs text-cyan-400 font-medium tracking-wide mt-1">Catch Every Lead.</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Main Menu
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.id === 'admin' && (
                <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">
                  ADMIN
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
