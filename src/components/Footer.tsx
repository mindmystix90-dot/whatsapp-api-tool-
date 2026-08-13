import React from 'react';
import { ShieldCheck, FileText, Trash2, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate?: (path: string) => void;
  variant?: 'dark' | 'light';
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, variant = 'light' }) => {
  const handleNav = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const isDark = variant === 'dark';

  return (
    <footer className={`w-full py-6 px-6 border-t transition-colors ${
      isDark 
        ? 'bg-slate-950 border-slate-800/80 text-slate-400' 
        : 'bg-white border-slate-200/80 text-slate-600'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Left branding & copyright */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Fishcatch WhatsApp Platform
          </span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline font-mono text-[11px] opacity-75">
            https://whatsapp-api-tool2.vercel.app
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="opacity-75">© {new Date().getFullYear()} All rights reserved.</span>
        </div>

        {/* Right Navigation Links */}
        <div className="flex items-center flex-wrap justify-center gap-6 font-medium">
          <a
            href="/privacy-policy"
            onClick={(e) => handleNav('/privacy-policy', e)}
            className={`flex items-center gap-1.5 transition-colors ${
              isDark 
                ? 'hover:text-cyan-400 text-slate-300' 
                : 'hover:text-cyan-600 text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Privacy Policy</span>
          </a>

          <a
            href="/terms"
            onClick={(e) => handleNav('/terms', e)}
            className={`flex items-center gap-1.5 transition-colors ${
              isDark 
                ? 'hover:text-cyan-400 text-slate-300' 
                : 'hover:text-cyan-600 text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Terms of Service</span>
          </a>

          <a
            href="/data-deletion"
            onClick={(e) => handleNav('/data-deletion', e)}
            className={`flex items-center gap-1.5 transition-colors ${
              isDark 
                ? 'hover:text-cyan-400 text-slate-300' 
                : 'hover:text-cyan-600 text-slate-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Data Deletion</span>
          </a>

          <a
            href="https://whatsapp-api-tool2.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] opacity-70 hover:opacity-100 transition-opacity"
          >
            <span>Production</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
};
