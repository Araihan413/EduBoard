"use client";

import { motion } from "framer-motion";
import { BookOpen, Target, Flame } from "lucide-react";
import { QuestionCard} from "../../store/gameStore";

interface QuestionPreviewProps {
  question: Partial<QuestionCard>;
  scale?: number;
}

export default function QuestionPreview({ question, scale = 1 }: QuestionPreviewProps) {
  const { type = 'DASAR', text = '', points = 10, options = [] } = question;

  const accent =
    type === "DASAR" ? { bg: "bg-[#2c49c5]", text: "text-[#2c49c5]", light: "bg-blue-50" } :
    type === "AKSI" ? { bg: "bg-red-600", text: "text-red-600", light: "bg-red-50" } : 
    { bg: "bg-orange-600", text: "text-orange-600", light: "bg-orange-50" };

  return (
    <div 
      className="flex items-center justify-center p-4 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200"
      style={{ minHeight: '400px' }}
    >
      <motion.div
        initial={{ rotateY: -10, rotateX: 5 }}
        animate={{ rotateY: 0, rotateX: 0 }}
        style={{ 
          width: 320, 
          height: 460, 
          scale,
          perspective: 1000
        }}
        className="relative"
      >
        <div
          className="absolute inset-0 bg-white rounded-[2.5rem] flex flex-col p-8 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-2 border-slate-100"
        >
          {/* Corner Accent */}
          <div
            className={`absolute top-0 right-0 w-32 h-32 ${accent.bg} opacity-10`}
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
          />

          {/* Header Section */}
          <div className="relative z-10 flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
             <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-1 ${accent.text}`}>
                  KARTU {type}
                </p>
                <div className="flex items-center gap-2">
                   <span className="text-3xl font-black text-slate-900 tracking-tighter">{points}</span>
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Poin</span>
                </div>
             </div>
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${accent.bg}`}>
                {type === 'DASAR' && <BookOpen size={20} />}
                {type === 'AKSI' && <Target size={20} />}
                {type === 'TANTANGAN' && <Flame size={20} />}
             </div>
          </div>

          <div className="flex-1 flex flex-col relative z-10 min-h-0">
             <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3">ISI KARTU</p>
                <p className="text-lg font-bold text-zinc-900 leading-snug mb-6">
                  {text ? `“${text}”` : "“Teks pertanyaan akan muncul di sini...”"}
                </p>

                {type === "DASAR" && options && options.length > 0 && (
                  <div className="space-y-2.5">
                    {options.map((opt, i) => (
                      <div
                        key={i}
                        className={`w-full text-left px-5 py-3 rounded-xl border-2 border-zinc-100 bg-white text-sm font-bold text-zinc-700 shadow-sm`}
                      >
                        <span className="text-[10px] font-black text-zinc-300 mr-3">{String.fromCharCode(65 + i)}</span>
                        {opt || "..."}
                      </div>
                    ))}
                  </div>
                )}
             </div>

             <div className="mt-4 pt-4 border-t-2 border-zinc-50">
                <div className="w-full py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black tracking-[0.2em] uppercase text-center opacity-20">
                  TAMPILAN PRATINJAU
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
