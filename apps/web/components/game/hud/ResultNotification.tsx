"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Award, X } from "lucide-react";
import { useGameStore, type AnswerResult } from "../../../store/gameStore";

interface ResultNotificationProps {
  result: AnswerResult;
  onClose: () => void;
}

export default function ResultNotification({ result, onClose }: ResultNotificationProps) {
  const { clearLastResult, myGroupName, isGuru } = useGameStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isSuccess = result.type === "SUCCESS";
  const isFailure = result.type === "FAILURE";
  const canClose  = (result.groupName && myGroupName && result.groupName.trim().toLowerCase() === myGroupName.trim().toLowerCase()) || isGuru;

  // Sync auto-close fail-safe for the active player or guru
  useEffect(() => {
    if (canClose) {
      const t = setTimeout(() => {
        if (onClose) onClose();
        else clearLastResult();
      }, 4000); // 4s fail-safe (giving 1s buffer after store's 3s timer)
      return () => clearTimeout(t);
    }
  }, [canClose, onClose, clearLastResult]);

  // Observer local fail-safe cleanup to prevent screen from being stuck
  useEffect(() => {
    if (!canClose) {
      const t = setTimeout(() => {
        useGameStore.setState({ lastResult: null });
      }, 6000); // 6s local cleanup for observers
      return () => clearTimeout(t);
    }
  }, [canClose]);

  const color =
    isSuccess ? "emerald" :
    isFailure ? "red"     : "blue";

  const colorMap = {
    emerald: { bg: "bg-emerald-500", text: "text-emerald-600", glow: "bg-emerald-500" },
    red:     { bg: "bg-red-500",     text: "text-red-600",     glow: "bg-red-500"     },
    blue:    { bg: "bg-blue-500",    text: "text-blue-600",    glow: "bg-blue-500"    },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: isMobile ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isMobile ? 0 : 24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ willChange: "transform, opacity" }}
      className="fixed inset-0 z-200 flex items-center justify-center p-6 pointer-events-none"
    >
      <div className="bg-white/95 border-2 border-slate-100 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 landscape-mobile:p-3.5 shadow-[0_40px_100px_rgba(0,0,0,0.15)] flex flex-col items-center max-w-sm w-[90%] md:w-full text-center relative overflow-hidden pointer-events-auto landscape-mobile:max-w-[230px] landscape-mobile:rounded-2xl">
        {canClose && (
          <button
            onClick={() => (onClose ? onClose() : clearLastResult())}
            className="absolute top-4 right-4 md:top-6 md:right-6 landscape-mobile:top-2 landscape-mobile:right-2 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
 
        {/* Glow */}
        {!isMobile && <div className={`absolute inset-0 opacity-10 blur-3xl pointer-events-none ${c.glow}`} />}
 
        {/* Icon */}
        <div className={`w-16 h-16 md:w-24 md:h-24 landscape-mobile:w-9 landscape-mobile:h-9 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-8 landscape-mobile:mb-1.5 border-4 border-white shadow-2xl ${c.bg}`}>
          {isSuccess ? <CheckCircle2 className="w-8 h-8 md:w-12 md:h-12 landscape-mobile:w-4.5 landscape-mobile:h-4.5 text-white" /> :
           isFailure ? <XCircle      className="w-8 h-8 md:w-12 md:h-12 landscape-mobile:w-4.5 landscape-mobile:h-4.5 text-white" /> :
                       <Award        className="w-8 h-8 md:w-12 md:h-12 landscape-mobile:w-4.5 landscape-mobile:h-4.5 text-white" />}
        </div>
 
        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1 md:mb-2 landscape-mobile:mb-0">{result.groupName}</p>
        <h2 className={`text-2xl md:text-4xl landscape-mobile:text-sm font-black tracking-tighter mb-2 md:mb-4 landscape-mobile:mb-0.5 ${c.text}`}>{result.title}</h2>
        <p className="text-sm md:text-lg landscape-mobile:text-[10px] landscape-mobile:leading-snug font-bold text-slate-600 leading-relaxed mb-4 md:mb-6 landscape-mobile:mb-1.5">{result.message}</p>
 
        <div className="bg-slate-50 px-4 py-2 md:px-6 md:py-3 landscape-mobile:px-2.5 landscape-mobile:py-0.5 rounded-xl md:rounded-2xl border border-slate-100">
          <span className="text-[9px] md:text-xs landscape-mobile:text-[7.5px] font-black text-slate-400 uppercase tracking-widest mr-2">POIN DIDAPAT:</span>
          <span className={`text-base md:text-xl landscape-mobile:text-xs font-black ${isSuccess ? c.text : "text-slate-900"}`}>
            {result.points > 0 ? `+${result.points}` : result.points}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
