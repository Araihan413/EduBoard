"use client";

import { Activity, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface LiveMonitoringConsoleProps {
  logs: string[];
}

export default function LiveMonitoringConsole({ logs }: LiveMonitoringConsoleProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl h-[600px] flex flex-col relative overflow-hidden">
      {/* Header Monitoring */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2c49c5]/10 rounded-xl flex items-center justify-center border border-[#2c49c5]/20">
            <Activity className="text-[#2c49c5] animate-pulse" size={20} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs">Live Monitoring</h3>
            <p className="text-emerald-500 text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> 
              Sistem Aktif
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <Clock size={12} className="text-slate-500" />
          <span className="text-slate-300 font-mono text-[10px] tracking-widest">{time}</span>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[11px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
            <p className="animate-pulse">Menunggu inisialisasi sesi...</p>
          </div>
        ) : (
          [...logs].map((log, i) => {
            const isSystem = log.includes("Room") || log.includes("Mulai") || log.includes("Inisialisasi");
            const isJoin = log.includes("Bergabung") || log.includes("Tim");
            const isAction = log.includes("Menjawab") || log.includes("Poin");
            
            return (
              <div key={i} className="flex gap-4 group hover:bg-white/5 p-2 rounded-lg transition-colors">
                <span className="text-slate-700 flex-shrink-0">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                <span className={`leading-relaxed font-bold ${
                  isSystem ? 'text-[#2c49c5]' : 
                  isJoin ? 'text-emerald-400' : 
                  isAction ? 'text-orange-400' : 
                  'text-slate-300'
                }`}>
                  {log}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Console Footer */}
      <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">EduBoard Engine v2.0</span>
        </div>
        <div className="flex items-center gap-1 opacity-20">
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <Activity size={10} className="text-slate-700" />
        </div>
      </div>
    </div>
  );
}
