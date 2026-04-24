"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, X } from "lucide-react";

interface MobileLogOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
}

export default function MobileLogOverlay({ isOpen, onClose, logs }: MobileLogOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-0 z-[200] bg-slate-950 p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
                <Activity className="text-[#2c49c5]" size={20} />
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Monitoring System</h3>
                <p className="text-emerald-500 text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest">
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Feed
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 font-mono text-[11px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {[...logs].reverse().map((log, i) => {
              const isSystem = log.includes("Room") || log.includes("Mulai") || log.includes("Inisialisasi");
              const isJoin = log.includes("Bergabung") || log.includes("Tim");
              const isAction = log.includes("Menjawab") || log.includes("Poin");
              
              return (
                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4">
                  <span className="text-slate-600 mt-0.5 opacity-40">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                  <span className={`leading-relaxed font-bold ${
                    isSystem ? 'text-blue-400' : 
                    isJoin ? 'text-emerald-400' : 
                    isAction ? 'text-orange-400' : 
                    'text-slate-300'
                  }`}>
                    {log}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center">
             <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">EduBoard Monitoring Engine</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
