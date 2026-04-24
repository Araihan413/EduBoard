"use client";

import { Activity } from "lucide-react";

interface MobileLiveTickerProps {
  logs: string[];
  onClick: () => void;
}

export default function MobileLiveTicker({ logs, onClick }: MobileLiveTickerProps) {
  return (
    <div className="lg:hidden mb-4">
       <button 
         onClick={onClick}
         className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl active:scale-[0.98] transition-all overflow-hidden relative"
       >
          {/* Animated background pulse */}
          <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
          
          <div className="flex items-center gap-3 relative z-10 overflow-hidden">
             <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
             <div className="flex flex-col items-start overflow-hidden">
                <span className="text-[8px] font-black text-[#2c49c5] uppercase tracking-[0.2em] mb-1">Recent Activity</span>
                <div className="space-y-1 w-full">
                   {logs.length > 0 ? (
                     logs.slice(-2).reverse().map((log, idx) => (
                       <p key={idx} className={`text-[10px] font-bold truncate w-full text-left ${idx === 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                         {log}
                       </p>
                     ))
                   ) : (
                     <p className="text-[10px] font-bold text-slate-500 italic">Menunggu aktivitas sistem...</p>
                   )}
                </div>
             </div>
          </div>
          <div className="flex-shrink-0 bg-slate-800 p-2 rounded-lg relative z-10">
             <Activity size={14} className="text-slate-400" />
          </div>
       </button>
    </div>
  );
}
