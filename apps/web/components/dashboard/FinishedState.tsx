"use client";

import { CheckCircle2, Trophy, Medal } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { motion } from "framer-motion";

export default function FinishedState() {
  const { resetToIdle, groups } = useGameStore();

  const sortedGroups = [...groups].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 text-center animate-in zoom-in duration-500 max-w-2xl mx-auto">
       <div className="w-20 h-20 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-yellow-100 shadow-lg shadow-yellow-500/10">
          <Trophy className="w-10 h-10 text-yellow-500" />
       </div>
       <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Misi Selesai!</h2>
       <p className="text-slate-500 mb-8 text-sm font-medium italic">Seluruh tim telah menyelesaikan petualangan mereka.</p>

       {/* Simple Leaderboard */}
       <div className="space-y-3 mb-10 text-left max-w-md mx-auto">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 text-center">Peringkat Akhir</p>
         {sortedGroups.map((g, idx) => (
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: idx * 0.1 }}
             key={g.id} 
             className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
               idx === 0 
                 ? 'bg-blue-50 border-blue-100 shadow-sm' 
                 : 'bg-slate-50/50 border-slate-100'
             }`}
           >
             <div className="flex items-center gap-4">
               <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                 idx === 0 ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-100'
               }`}>
                 {idx + 1}
               </div>
               <div className="flex flex-col">
                 <span className={`text-sm font-black ${idx === 0 ? 'text-[#2c49c5]' : 'text-slate-700'}`}>{g.name}</span>
               </div>
             </div>
             <div className="text-right">
               <span className={`text-lg font-black ${idx === 0 ? 'text-blue-600' : 'text-slate-900'}`}>{g.score}</span>
               <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Pts</span>
             </div>
           </motion.div>
         ))}
       </div>

       <button 
         onClick={resetToIdle} 
         className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 uppercase tracking-widest text-xs"
       >
         Kembali ke Setup Hub
       </button>
    </div>
  );
}
