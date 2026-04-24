"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Bookmark, Star, Sparkles } from "lucide-react";
import { type PendingReview } from "../../store/gameStore";

interface TeacherReviewPanelProps {
  pendingReviews: PendingReview[];
  onGrade: (reviewId: string, score: number) => void;
}

export default function TeacherReviewPanel({ pendingReviews, onGrade }: TeacherReviewPanelProps) {
  if (pendingReviews.length === 0) return null;

  // We only show the most recent one for focus
  const currentReview = pendingReviews[0];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        <motion.div
          key={currentReview.id}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 md:h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 z-10" />
          
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:y-8 scrollbar-thin scrollbar-thumb-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center border border-blue-100 flex-shrink-0">
                   <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                   <h4 className="text-slate-900 font-black text-lg md:text-xl tracking-tight leading-none truncate">Penilaian</h4>
                   <p className="text-blue-600 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1 truncate">Tim: {currentReview.groupName}</p>
                </div>
              </div>
              <div className="bg-slate-100 text-slate-500 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-slate-200 flex-shrink-0">
                Max {currentReview.maxPoints}
              </div>
            </div>

            {/* Content Card */}
            <div className="space-y-4 md:space-y-6">
               <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={10} className="md:w-3 md:h-3" /> Pertanyaan
                  </span>
                  <p className="text-slate-800 text-base md:text-lg font-bold leading-snug">{currentReview.questionText}</p>
               </div>
               
               <div className="p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[2rem] relative shadow-inner">
                  <Bookmark className="absolute top-3 right-3 md:top-4 md:right-4 w-4 h-4 md:w-5 md:h-5 text-slate-200" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Jawaban Siswa:</span>
                  <p className="text-slate-900 text-lg md:text-2xl font-black italic leading-tight tracking-tight">&quot;{currentReview.answerText}&quot;</p>
               </div>
            </div>

            {/* Grading Actions */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Skor Penilaian</span>
              
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <button 
                  onClick={() => onGrade(currentReview.id, 0)}
                  className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl md:rounded-3xl bg-white border-2 border-slate-100 hover:border-red-500 hover:bg-red-50 transition-all group"
                >
                    <XCircle className="w-6 h-6 md:w-8 md:h-8 text-slate-300 group-hover:text-red-500 transition-colors" />
                    <div className="text-center">
                      <span className="block text-[9px] md:text-xs font-black text-slate-400 group-hover:text-red-600 uppercase tracking-tighter">Salah</span>
                      <span className="text-[8px] md:text-[10px] font-bold text-slate-300 group-hover:text-red-400 uppercase">0 PT</span>
                    </div>
                </button>
                
                <button 
                  onClick={() => onGrade(currentReview.id, Math.floor(currentReview.maxPoints / 2))}
                  className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl md:rounded-3xl bg-white border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                >
                    <Star className="w-6 h-6 md:w-8 md:h-8 text-slate-300 group-hover:text-orange-500 transition-colors" />
                    <div className="text-center">
                      <span className="block text-[9px] md:text-xs font-black text-slate-400 group-hover:text-orange-600 uppercase tracking-tighter">Setengah</span>
                      <span className="text-[8px] md:text-[10px] font-bold text-slate-300 group-hover:text-orange-400 uppercase">{Math.floor(currentReview.maxPoints / 2)} PT</span>
                    </div>
                </button>
                
                <button 
                  onClick={() => onGrade(currentReview.id, currentReview.maxPoints)}
                  className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl md:rounded-3xl bg-white border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group shadow-sm hover:shadow-xl hover:shadow-emerald-500/10"
                >
                    <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    <div className="text-center">
                      <span className="block text-[9px] md:text-xs font-black text-slate-400 group-hover:text-emerald-600 uppercase tracking-tighter">Tuntas</span>
                      <span className="text-[8px] md:text-[10px] font-bold text-slate-300 group-hover:text-emerald-400 uppercase">{currentReview.maxPoints} PT</span>
                    </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="bg-slate-50 p-3 md:p-4 border-t border-slate-100 flex items-center justify-center gap-2 flex-shrink-0">
            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Keputusan Guru Adalah Mutlak</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

