import React from 'react';
import { Headphones, MessageCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface FloatingSupportButtonProps {
  onOpenSupport: () => void;
}

export const FloatingSupportButton: React.FC<FloatingSupportButtonProps> = ({ onOpenSupport }) => {
  const { settings } = useSettings();

  return (
    <div
      id="floating-support-container"
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 flex items-center space-x-2"
    >
      <button
        id="floating-customer-support-btn"
        type="button"
        onClick={onOpenSupport}
        className="group relative flex items-center space-x-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl border border-amber-500/40 hover:border-amber-400 transition-all duration-300 active:scale-95"
        title="Customer Support & Help Desk"
        aria-label="Customer Support"
      >
        {/* Pulse indicator */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>

        <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
          <Headphones className="w-3.5 h-3.5" />
        </div>

        <span className="text-xs font-black text-white tracking-wide pr-1">
          Support
        </span>

        {/* Floating tooltip on hover */}
        <span className="absolute -top-8 right-0 bg-slate-950 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none border border-amber-500/20">
          Customer Support
        </span>
      </button>
    </div>
  );
};
