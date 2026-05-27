"use client";

import { useGameStore } from "@/store/gameStore";
import { AlertCircle, RotateCw, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SupersededOverlay() {
  const { isSuperseded, reactivateSession, exitToLobby } = useGameStore();

  return (
    <AnimatePresence>
      {isSuperseded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-md bg-white border border-slate-200/80 rounded-[2rem] p-8 shadow-2xl shadow-slate-950/20 text-center relative overflow-hidden"
          >
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 animate-pulse" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-100/30 blur-[60px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-100/30 blur-[60px] rounded-full" />

            {/* Warning Icon */}
            <div className="mx-auto w-16 h-16 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertCircle size={32} />
              </motion.div>
            </div>

            {/* Content */}
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-3">
              Sesi Terbuka di Tab Lain
            </h2>
            
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
              Papan permainan hanya dapat aktif pada satu tab browser saja. 
              Tab ini telah dinonaktifkan sementara untuk mencegah bentrokan data atau manipulasi putaran dadu ganda.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3 relative z-10">
              <button
                onClick={reactivateSession}
                className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 group"
              >
                <RotateCw size={14} className="group-hover:rotate-45 transition-transform" />
                Gunakan di Tab Ini
              </button>
              
              <button
                onClick={exitToLobby}
                className="w-full h-12 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                Keluar ke Lobby
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
