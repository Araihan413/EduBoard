"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Bookmark, Star } from "lucide-react";
import { type PendingReview } from "../../store/gameStore";

interface TeacherReviewPanelProps {
  pendingReviews: PendingReview[];
  onGrade: (reviewId: string, score: number) => void;
}

export default function TeacherReviewPanel({ pendingReviews, onGrade }: TeacherReviewPanelProps) {
  if (pendingReviews.length === 0) return null;

  // We only show the most recent one for focus, but we could list them
  const currentReview = pendingReviews[0];

  return (
    <div className="fixed top-24 right-6 z-[100] w-full max-w-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentReview.id}
          initial={{ x: 100, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.9 }}
          className="bg-slate-900/90 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative background accent */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-white/10">
                   <AlertCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                   <h4 className="text-white font-black text-sm uppercase tracking-wider italic">Tugas Menunggu</h4>
                   <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{currentReview.groupName}</p>
                </div>
              </div>
              <div className="bg-[#ffda59] text-slate-900 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                MAKS {currentReview.maxPoints} PT
              </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pertanyaan:</span>
                  <p className="text-white text-sm font-bold leading-relaxed">{currentReview.questionText}</p>
               </div>
               
               <div className="p-5 bg-white/5 border border-white/10 rounded-2xl relative">
                  <Bookmark className="absolute top-3 right-3 w-4 h-4 text-white/10" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2 underline">Jawaban Siswa:</span>
                  <p className="text-slate-200 text-lg font-black italic">&quot;{currentReview.answerText}&quot;</p>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
               <button 
                 onClick={() => onGrade(currentReview.id, 0)}
                 className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-500 transition-all group group"
               >
                  <XCircle className="w-5 h-5 text-red-500 group-hover:text-white" />
                  <span className="text-[9px] font-black text-red-500 group-hover:text-white uppercase tracking-tighter italic">Salah</span>
               </button>
               
               <button 
                 onClick={() => onGrade(currentReview.id, Math.floor(currentReview.maxPoints / 2))}
                 className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500 hover:border-orange-500 transition-all group"
               >
                  <Star className="w-5 h-5 text-orange-500 group-hover:text-white" />
                  <span className="text-[9px] font-black text-orange-500 group-hover:text-white uppercase tracking-tighter italic">Kurang</span>
               </button>
               
               <button 
                 onClick={() => onGrade(currentReview.id, currentReview.maxPoints)}
                 className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:border-emerald-500 transition-all group shadow-lg shadow-emerald-500/20"
               >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 group-hover:text-white" />
                  <span className="text-[9px] font-black text-emerald-500 group-hover:text-white uppercase tracking-tighter italic">Tuntas</span>
               </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

