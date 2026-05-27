"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Target, Flame } from "lucide-react";
import { getCardAccent } from "../config/gameConfig";

// ─── PhysicalDeck ─────────────────────────────────────────────────────────────

interface CardDeckProps {
  type: string;
  label: string;
  isDrawn: boolean;
}

function DeckIcon({ type }: { type: string }) {
  switch (type) {
    case "DASAR":     return <BookOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />;
    case "TANTANGAN": return <Target   className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />;
    default:          return <Flame    className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />;
  }
}

const DECK_DESCRIPTIONS: Record<string, string> = {
  DASAR: "Kuis Pilihan Ganda tentang materi pemahaman dasar PAI.",
  TANTANGAN: "Misi praktik seru & tanya jawab lisan aplikatif.",
  PEMAHAMAN: "Soal esai subjektif untuk menguji analisis mendalam.",
};

export default function CardDeck({ type, label, isDrawn }: CardDeckProps) {
  const accent = getCardAccent(type);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative cursor-pointer group z-50 pointer-events-auto w-[62px] h-[88px] sm:w-[85px] sm:h-[120px]"
    >
      {/* Floating Chat Bubble Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.85, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 10, scale: 0.85, x: "-50%" }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="absolute -top-[82px] sm:-top-24 left-1/2 w-[136px] sm:w-48 p-2 sm:p-3 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.12)] text-center flex flex-col items-center z-[100] pointer-events-none select-none"
          >
            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider mb-0.5 sm:mb-1 ${
              type === "DASAR" ? "text-blue-500" : type === "TANTANGAN" ? "text-red-500" : "text-orange-500"
            }`}>
              Kartu {label}
            </span>
            <p className="text-[7.5px] sm:text-[9px] font-medium text-slate-500 leading-normal">
              {DECK_DESCRIPTIONS[type] ?? "Klik untuk menarik kartu."}
            </p>
            
            {/* Speech Bubble Arrow Pointer */}
            <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-100/50" />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Stack layers */}
      <div className="absolute inset-0 translate-x-[4px] translate-y-[4px] sm:translate-x-[6px] sm:translate-y-[6px] bg-slate-300 rounded-lg sm:rounded-xl" />
      <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] sm:translate-x-[3px] sm:translate-y-[3px] bg-slate-200 rounded-lg sm:rounded-xl border border-slate-300" />

      {/* Top Card Face */}
      <div
        className={`absolute inset-0 bg-white rounded-lg sm:rounded-xl flex flex-col items-center justify-center border border-white sm:border-2 shadow-xl overflow-hidden transition-all duration-500 ${
          isDrawn ? "opacity-30 scale-95" : "opacity-100"
        }`}
      >
        {/* Subtle dot pattern */}
        <div
          className={`absolute inset-0 opacity-[0.05] ${accent.bg}`}
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize:  "12px 12px",
          }}
        />

        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1.5 sm:mb-3 ${accent.bg} shadow-lg shadow-black/10`}>
          <DeckIcon type={type} />
        </div>

        <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-800">{label}</span>

        {/* Glossy shimmer */}
        <div className="absolute -top-10 -left-10 w-20 h-40 bg-white/40 rotate-45 pointer-events-none group-hover:left-40 transition-all duration-700" />
      </div>

      {/* Drawing indicator */}
      {isDrawn && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
        </div>
      )}
    </motion.div>
  );
}
