"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitFork, ArrowRight, Shuffle } from "lucide-react";
import { getTileById } from "../config/gameConfig";
import { useGameStore } from "../../../store/gameStore";

// ─── PathSelector ─────────────────────────────────────────────────────────────

interface PathSelectorProps {
  isMyTurn: boolean;
  activeGroupName: string;
}

export default function PathSelector({ isMyTurn, activeGroupName }: PathSelectorProps) {
  const { isChoosingPath, availablePaths, selectBranch } = useGameStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // NOTE: AnimatePresence MUST wrap the conditional — do NOT do early return before
  // AnimatePresence, otherwise the exit animation never plays and the component
  // will flash twice when the server echo arrives after the user chose.
  return (
    <AnimatePresence>
      {isChoosingPath && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/75 pointer-events-auto"
          />

          {/* Card */}
          <motion.div
            initial={isMobile ? undefined : { opacity: 0, y: 24 }}
            animate={isMobile ? undefined : { opacity: 1, y: 0 }}
            exit={isMobile ? undefined : { opacity: 0, y: 24 }}
            transition={isMobile ? { duration: 0.2 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 bg-white rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.25)] border border-slate-100 max-w-sm w-full text-center pointer-events-auto"
          >
            {/* Glow */}
            {!isMobile && <div className="absolute inset-0 rounded-[2.5rem] bg-yellow-400/10 pointer-events-none" />}

            {/* Icon */}
            <div className="w-20 h-20 mx-auto bg-yellow-50 rounded-3xl flex items-center justify-center mb-6 border-2 border-yellow-100 shadow-inner">
              <GitFork className="w-10 h-10 text-yellow-500" />
            </div>

            {/* Title */}
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-1">
              Persimpangan!
            </p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Pilih Jalan
            </h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
              {isMyTurn
                ? "Pilih arah yang ingin kamu tempuh. Sisa langkah akan dilanjutkan di jalur yang kamu pilih."
                : `Tim ${activeGroupName} sedang memilih arah...`}
            </p>

            {isMyTurn ? (
              <div className="flex flex-col gap-3">
                {availablePaths.map((tileId, index) => {
                  let tile: ReturnType<typeof getTileById> | null = null;
                  try { tile = getTileById(tileId); } catch { tile = null; }

                  return (
                    <button
                      key={tileId}
                      onClick={() => selectBranch(tileId)}
                      className={`group w-full flex items-center justify-between px-6 py-4 rounded-2xl border-2 shadow-sm active:scale-95 transition-transform ${
                        index === 0
                          ? "border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
                          : "border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                          index === 0 ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
                        }`}>
                          {index === 0 ? "A" : "B"}
                        </div>
                        <div className="text-left">
                          <p className={`text-xs font-black uppercase tracking-wider ${
                            index === 0 ? "text-blue-700" : "text-amber-700"
                          }`}>
                            {index === 0 ? "Jalur Utama" : "Jalur Pintas"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Tile #{tileId} • {tile?.type ?? "..."}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                        index === 0 ? "text-blue-400" : "text-amber-400"
                      }`} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <Shuffle className={`w-8 h-8 text-slate-300 ${isMobile ? "animate-pulse" : "animate-spin-slow"}`} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Menunggu pilihan tim {activeGroupName}...
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
