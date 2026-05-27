"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Award, X } from "lucide-react";
import { useGameStore, type AnswerResult } from "../../../store/gameStore";

interface ResultNotificationProps {
  result: AnswerResult;
  onClose: () => void;
}

export default function ResultNotification({ result, onClose }: ResultNotificationProps) {
  const { clearLastResult, myGroupName } = useGameStore();

  const isSuccess = result.type === "SUCCESS";
  const isFailure = result.type === "FAILURE";
  const canClose  = result.groupName === myGroupName;

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
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1,   y: 0  }}
      exit={  { opacity: 0, scale: 0.8, y: 50  }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 pointer-events-none"
    >
      <div className="bg-white/95 backdrop-blur-3xl border-2 border-slate-100 rounded-[2.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.15)] flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden pointer-events-auto">
        {canClose && (
          <button
            onClick={() => (onClose ? onClose() : clearLastResult())}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Glow */}
        <div className={`absolute inset-0 opacity-10 blur-3xl pointer-events-none ${c.glow}`} />

        {/* Icon */}
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border-4 border-white shadow-2xl ${c.bg}`}>
          {isSuccess ? <CheckCircle2 className="w-12 h-12 text-white" /> :
           isFailure ? <XCircle      className="w-12 h-12 text-white" /> :
                       <Award        className="w-12 h-12 text-white" />}
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">{result.groupName}</p>
        <h2 className={`text-4xl font-black tracking-tighter mb-4 ${c.text}`}>{result.title}</h2>
        <p className="text-lg font-bold text-slate-600 leading-relaxed mb-6">{result.message}</p>

        <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">POIN DIDAPAT:</span>
          <span className={`text-xl font-black ${isSuccess ? c.text : "text-slate-900"}`}>
            {result.points > 0 ? `+${result.points}` : result.points}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
