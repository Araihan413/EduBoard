"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import type { Group } from "../../../store/gameStore";

interface LeaderboardOverlayProps {
  groups: Group[];
  role: string;
  isMidGame?: boolean;
  onClose?: () => void;
}

export default function LeaderboardOverlay({ groups, role, isMidGame = false, onClose }: LeaderboardOverlayProps) {
  const router = useRouter();

  const sortedGroups = [...groups].sort((a, b) => {
    if (a.status === "SURRENDERED" && b.status !== "SURRENDERED") return 1;
    if (a.status !== "SURRENDERED" && b.status === "SURRENDERED") return -1;
    return b.score - a.score;
  });

  const winner    = sortedGroups[0]?.status !== "SURRENDERED" ? sortedGroups[0] : null;
  const runnersUp = winner ? sortedGroups.slice(1) : sortedGroups;

  useEffect(() => {
    if (isMidGame || !winner) return;
    const duration    = 5000;
    const animationEnd = Date.now() + duration;
    const defaults    = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 500 };
    const rand        = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: rand(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: rand(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, [winner, isMidGame]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ willChange: "opacity" }}
      className="fixed inset-0 z-250 bg-black/75 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        style={{ willChange: "transform, opacity" }}
        className="max-w-xl w-[92%] sm:w-full h-[80vh] max-h-[580px] sm:max-h-[720px] md:max-h-[800px] bg-slate-950 border border-white/10 rounded-[2rem] sm:rounded-[3.5rem] p-5 sm:p-10 md:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col items-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 blur-[100px] -z-10" />

        {/* Close Button X (Mid-Game only) */}
        {isMidGame && onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer z-50 group"
          >
            <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Winner or Mid-Game Header or No-winner */}
        {isMidGame ? (
          <div className="text-center mb-4 sm:mb-8 pt-2 sm:pt-4">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full mb-2 sm:mb-4 shadow-inner">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 animate-bounce" />
              <span className="text-[8px] sm:text-[10px] font-black tracking-widest text-yellow-400 uppercase leading-none">Peringkat Sesi</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mb-1 sm:mb-2">Papan Skor Sementara</h1>
            <p className="text-slate-400 text-[10px] sm:text-xs font-medium">Memantau detail poin, status, dan posisi petak tim secara real-time.</p>
          </div>
        ) : winner ? (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            className="text-center mb-3 sm:mb-8 relative pt-1 sm:pt-2"
          >
            {/* Trophy Icon - Placed in normal flow so it never gets clipped by overflow-hidden */}
            <div className="flex justify-center mb-2 sm:mb-5">
              <motion.div 
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.12, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Trophy className="w-10 h-10 sm:w-15 sm:h-15 text-yellow-400 filter drop-shadow-[0_0_16px_rgba(250,204,21,0.6)]" />
              </motion.div>
            </div>
            
            <p className="text-yellow-400 font-black tracking-[0.4em] uppercase text-[7px] sm:text-[9px] mb-1 sm:mb-2.5">SANG JUARA</p>
            <h1 className="text-sm sm:text-2xl md:text-3xl font-black text-white tracking-tight mb-1 sm:mb-3">{winner.name}</h1>
            <div className="inline-flex items-center gap-1.5 sm:gap-3 bg-white/10 px-3 py-2 sm:px-5 sm:py-1.5 rounded-full border border-white/20 backdrop-blur-md">
              <span className="text-xs sm:text-lg font-black text-white">{winner.score}</span>
              <span className="text-[7px] sm:text-[9px] font-bold text-white/50 uppercase tracking-wider">Total Poin</span>
            </div>
          </motion.div>
        ) : (
          <div className="text-center mb-6 sm:mb-12 pt-4 sm:pt-8">
            <XCircle className="w-8 h-8 sm:w-12 sm:h-12 text-slate-500 mx-auto mb-2 sm:mb-4 opacity-50" />
            <p className="text-slate-400 font-black tracking-[0.5em] uppercase text-[8px] sm:text-[10px] mb-1 sm:mb-2">SESI BERAKHIR</p>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tighter mb-1 sm:mb-2">Semua Tim Menyerah</h1>
            <p className="text-slate-500 text-[10px] sm:text-xs font-medium">Tidak ada pemenang dalam sesi ini.</p>
          </div>
        )}

        {/* Runner-up list or Full list */}
        <div className="w-full flex-1 overflow-y-auto overscroll-contain pr-1 sm:pr-2 custom-scrollbar space-y-1.5 sm:space-y-3 mb-4 sm:mb-8">
          {(isMidGame ? sortedGroups : runnersUp).map((group, index) => {
            const isSurrendered = group.status === "SURRENDERED";
            const displayRank   = isMidGame ? index + 1 : (winner ? index + 2 : index + 1);
            const isRankOne     = isMidGame && index === 0;

            return (
              <motion.div
                key={group.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: (isMidGame ? 0.2 : 0.8) + index * 0.1 }}
                className={`bg-white/5 border p-2 sm:p-3.5 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors group ${
                  isRankOne 
                    ? "border-yellow-400/30 bg-yellow-400/5 shadow-[0_0_20px_rgba(250,204,21,0.03)]" 
                    : "border-white/10"
                } ${isSurrendered ? "opacity-40 grayscale" : ""}`}
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all ${
                    isRankOne
                      ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400"
                      : "bg-white/5 border-white/10 text-white/40 group-hover:border-white/30"
                  }`}>
                    {isRankOne ? (
                      <Trophy className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-yellow-400" />
                    ) : (
                      <span className="text-xs sm:text-lg font-black group-hover:text-white transition-colors">
                        {isSurrendered ? "—" : displayRank}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-lg font-bold text-white tracking-tight flex items-center gap-1 sm:gap-2">
                      {group.name}
                      {isRankOne && (
                        <span className="px-1.5 py-0.5 bg-yellow-400/20 text-yellow-400 text-[5px] sm:text-[8px] font-black uppercase tracking-widest rounded-md border border-yellow-400/30 leading-none">
                          LEADER
                        </span>
                      )}
                    </h4>

                    {/* Position & Status Bar */}
                    {isMidGame ? (
                      <div className="flex items-center gap-1 sm:gap-2.5 mt-0.5 sm:mt-1.5 flex-wrap">
                        {isSurrendered ? (
                          <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[5.5px] sm:text-[7px] font-black uppercase tracking-widest rounded-md border border-red-500/30 leading-none">
                            OUT
                          </span>
                        ) : group.isOffline ? (
                          <span className="px-1 py-0.5 bg-slate-500/20 text-slate-400 text-[5.5px] sm:text-[7px] font-black uppercase tracking-widest rounded-md border border-slate-500/30 animate-pulse leading-none">
                            OFFLINE
                          </span>
                        ) : (
                          <span className="px-1 py-0.5 bg-emerald-500/20 text-emerald-400 text-[5.5px] sm:text-[7px] font-black uppercase tracking-widest rounded-md border border-emerald-500/30 flex items-center gap-0.5 sm:gap-1 leading-none">
                            <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-emerald-400 rounded-full animate-ping" />
                            ONLINE
                          </span>
                        )}

                        <span className="px-1 py-0.5 bg-white/5 border border-white/10 text-white/60 text-[6px] sm:text-[8px] font-black uppercase tracking-wider rounded-md leading-none">
                          📍 Petak {group.position === 0 ? "START" : group.position}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[7px] sm:text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-0.5">
                        {isSurrendered ? "Menyerah" : `Peringkat ${displayRank}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-xl font-black text-white">{group.score}</span>
                  <p className="text-[6px] sm:text-[9px] font-bold text-white/30 uppercase">Poin</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {isMidGame && onClose ? (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="mt-4 sm:mt-10 px-6 py-2 sm:px-8 sm:py-3 bg-white text-slate-900 rounded-lg sm:rounded-xl font-black tracking-widest uppercase text-[10px] sm:text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-[0_20px_50px_rgba(255,255,255,0.15)] cursor-pointer"
          >
            Tutup Papan Skor
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            onClick={() => router.push(role === "guru" ? "/dashboard" : "/lobby")}
            className="mt-4 sm:mt-10 px-6 py-2 sm:px-8 sm:py-3 bg-white text-slate-900 rounded-lg sm:rounded-xl font-black tracking-widest uppercase text-[10px] sm:text-xs hover:scale-105 transition-transform shadow-2xl cursor-pointer"
          >
            {role === "guru" ? "Kembali ke Dashboard" : "Kembali ke Lobby"}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
