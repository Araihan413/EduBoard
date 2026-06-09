"use client";

import { useEffect, useState } from "react";
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
  onNavigateBack?: () => void;
}

export default function LeaderboardOverlay({ groups, role, isMidGame = false, onClose, onNavigateBack }: LeaderboardOverlayProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sortedGroups = [...groups].sort((a, b) => {
    if (a.status === "SURRENDERED" && b.status !== "SURRENDERED") return 1;
    if (a.status !== "SURRENDERED" && b.status === "SURRENDERED") return -1;
    return b.score - a.score;
  });

  const winner    = sortedGroups[0]?.status !== "SURRENDERED" ? sortedGroups[0] : null;
  const runnersUp = winner ? sortedGroups.slice(1) : sortedGroups;

  useEffect(() => {
    if (isMidGame || !winner) return;
    // Kurangi efek di mobile: lebih sedikit partikel, interval lebih jarang, durasi lebih singkat
    const duration     = isMobile ? 2500 : 5000;
    const maxParticles = isMobile ? 15   : 50;
    const intervalMs   = isMobile ? 400  : 250;
    const animationEnd = Date.now() + duration;
    const defaults     = { startVelocity: 30, spread: 360, ticks: isMobile ? 40 : 60, zIndex: 10000 };
    const rand         = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = maxParticles * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: rand(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: rand(0.7, 0.9), y: Math.random() - 0.2 } });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [winner, isMidGame, isMobile]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ willChange: "opacity" }}
        className={`absolute inset-0 ${isMobile ? "bg-black/90" : "bg-black/75"} pointer-events-none`}
      />

      <motion.div
        initial={{ scale: isMobile ? 0.98 : 0.9, y: isMobile ? 0 : 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        style={{ willChange: "transform, opacity" }}
        className={`bg-slate-950 border border-white/10 rounded-[2.5rem] p-5 sm:p-8 md:p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden w-[95%] sm:w-full min-h-0 pointer-events-auto ${
          !isMidGame && winner 
            ? "max-w-md md:max-w-4xl h-[90vh] md:h-[75vh] max-h-[580px] md:max-h-[500px]" 
            : "max-w-xl h-[80vh] max-h-[580px] sm:max-h-[640px]"
        }`}
      >
        {!isMobile && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 blur-[100px] -z-10" />}

        {/* Close Button X (Mid-Game only) */}
        {isMidGame && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer z-50 group"
          >
            <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Conditional Layout */}
        {!isMidGame && winner ? (
          /* Final Winner: Beautiful 2-Column layout on desktop, compact stack on mobile */
          <div className="flex-1 w-full flex flex-col md:flex-row gap-5 md:gap-8 overflow-hidden items-stretch min-h-0">
            
            {/* Left Column: Winner Banner */}
            <motion.div
              initial={{ y: isMobile ? 0 : 24, opacity: 0, scale: isMobile ? 0.98 : 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={isMobile ? { duration: 0.25 } : { type: "spring", delay: 0.3 }}
              className="flex-shrink-0 md:w-[40%] flex flex-col items-center justify-center text-center pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-white/10 md:pr-8 min-h-0"
            >
              {/* Trophy Icon */}
              <div className="flex justify-center mb-1.5 sm:mb-3">
                <motion.div 
                  animate={isMobile ? { scale: [1, 1.05, 1] } : { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }} 
                  transition={isMobile ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 2, repeat: Infinity }}
                >
                  <Trophy className="w-10 h-10 md:w-16 md:h-16 text-yellow-400 filter drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
                </motion.div>
              </div>
              
              <p className="text-yellow-400 font-black tracking-[0.3em] uppercase text-[8px] sm:text-[9px] mb-1">SANG JUARA</p>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight mb-1 sm:mb-2 max-w-full truncate px-2">{winner.name}</h1>
              <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-white/20">
                <span className="text-xs sm:text-sm md:text-base font-black text-white">{winner.score}</span>
                <span className="text-[7px] sm:text-[8px] font-bold text-white/50 uppercase tracking-wider">Total Poin</span>
              </div>
            </motion.div>

            {/* Right Column: Other Group Standings & Navigation Button */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <p className="text-slate-400 font-bold uppercase tracking-[0.15em] text-[8px] mb-2 text-center md:text-left flex-shrink-0">
                Peringkat Tim Lainnya
              </p>
              
              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto overscroll-contain pr-1 sm:pr-2 custom-scrollbar space-y-2 mb-4 min-h-[120px]">
                {runnersUp.map((group, index) => {
                  const isSurrendered = group.status === "SURRENDERED";
                  const displayRank   = index + 2;

                  return (
                    <motion.div
                      key={group.id}
                      initial={{ x: isMobile ? 0 : -12, opacity: 0 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: isMobile ? 0 : 0.4 + index * 0.08 }}
                      className={`bg-white/5 border border-white/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors group ${
                        isSurrendered ? "opacity-40 grayscale" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/5 border border-white/10 text-white/40 group-hover:border-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all">
                          {isSurrendered ? "—" : displayRank}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-tight truncate max-w-[120px] sm:max-w-[180px]">
                            {group.name}
                          </h4>
                          <p className="text-[7px] sm:text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-0.5">
                            {isSurrendered ? "Menyerah" : `Peringkat ${displayRank}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs sm:text-base font-black text-white">{group.score}</span>
                        <p className="text-[6px] sm:text-[8px] font-bold text-white/30 uppercase">Poin</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Navigation button inside the flex column */}
             <div className="flex items-center justify-center py-1">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={isMobile ? { duration: 0.15 } : { delay: 0.6 }}
                onClick={() => {
                  if (onNavigateBack) {
                    onNavigateBack();
                  }
                  router.push(role === "guru" ? "/dashboard" : "/lobby");
                }}
                className="w-[90%] py-2.5 sm:py-3.5 bg-white text-slate-900 rounded-xl font-black tracking-widest uppercase text-[10px] sm:text-xs hover:scale-[1.02] transition-transform shadow-2xl cursor-pointer flex-shrink-0"
              >
                {role === "guru" ? "Kembali ke Dashboard" : "Kembali ke Lobby"}
              </motion.button>
              </div>
            </div>
          </div>
        ) : (
          /* Mid-game Scoreboard or game over without winner: Standard Single Column but compact */
          <div className="flex-1 w-full flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            {isMidGame ? (
              <div className="text-center mb-3 sm:mb-5 pt-1 flex-shrink-0">
                <div className="inline-flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full mb-1.5 shadow-inner">
                  <Trophy className="w-3 h-3 text-yellow-400 animate-bounce" />
                  <span className="text-[8px] font-black tracking-widest text-yellow-400 uppercase leading-none">Peringkat Sesi</span>
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight mb-1">Papan Skor Sementara</h1>
                <p className="text-slate-400 text-[9px] sm:text-xs font-medium">Memantau detail poin, status, dan posisi petak tim secara real-time.</p>
              </div>
            ) : (
              <div className="text-center mb-4 sm:mb-6 pt-2 flex-shrink-0">
                <XCircle className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-slate-400 font-black tracking-[0.4em] uppercase text-[8px] mb-1">SESI BERAKHIR</p>
                <h1 className="text-base sm:text-xl font-black text-white tracking-tighter mb-1">Semua Tim Menyerah</h1>
                <p className="text-slate-500 text-[9px] sm:text-xs font-medium">Tidak ada pemenang dalam sesi ini.</p>
              </div>
            )}

            {/* Full list of groups */}
            <div className="flex-1 overflow-y-auto overscroll-contain pr-1 sm:pr-2 custom-scrollbar space-y-1.5 sm:space-y-2 mb-4 min-h-[160px]">
              {sortedGroups.map((group, index) => {
                const isSurrendered = group.status === "SURRENDERED";
                const displayRank   = index + 1;
                const isRankOne     = index === 0;

                return (
                  <motion.div
                    key={group.id}
                    initial={{ x: isMobile ? 0 : -12, opacity: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: isMobile ? 0 : index * 0.06 }}
                    className={`bg-white/5 border p-2 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors group ${
                      isRankOne 
                        ? "border-yellow-400/30 bg-yellow-400/5 shadow-[0_0_20px_rgba(250,204,21,0.03)]" 
                        : "border-white/10"
                    } ${isSurrendered ? "opacity-40 grayscale" : ""}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all ${
                        isRankOne
                          ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400"
                          : "bg-white/5 border-white/10 text-white/40 group-hover:border-white/30"
                      }`}>
                        {isRankOne ? (
                          <Trophy className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-yellow-400" />
                        ) : (
                          <span className="text-xs sm:text-base font-black group-hover:text-white transition-colors">
                            {isSurrendered ? "—" : displayRank}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-base font-bold text-white tracking-tight flex items-center gap-1 sm:gap-1.5 truncate max-w-[120px] sm:max-w-[200px]">
                          {group.name}
                          {isRankOne && (
                            <span className="px-1.5 py-0.5 bg-yellow-400/20 text-yellow-400 text-[5px] sm:text-[7px] font-black uppercase tracking-widest rounded-md border border-yellow-400/30 leading-none">
                              LEADER
                            </span>
                          )}
                        </h4>

                        {/* Position & Status Bar */}
                        <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                          {isSurrendered ? (
                            <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[5px] sm:text-[6px] font-black uppercase tracking-widest rounded-md border border-red-500/30 leading-none">
                              OUT
                            </span>
                          ) : group.isOffline ? (
                            <span className="px-1 py-0.5 bg-slate-500/20 text-slate-400 text-[5px] sm:text-[6px] font-black uppercase tracking-widest rounded-md border border-slate-500/30 animate-pulse leading-none">
                              OFFLINE
                            </span>
                          ) : (
                            <span className="px-1 py-0.5 bg-emerald-500/20 text-emerald-400 text-[5px] sm:text-[6px] font-black uppercase tracking-widest rounded-md border border-emerald-500/30 flex items-center gap-0.5 leading-none">
                              <span className="w-0.5 h-0.5 bg-emerald-400 rounded-full animate-ping" />
                              ONLINE
                            </span>
                          )}

                          <span className="px-1 py-0.5 bg-white/5 border border-white/10 text-white/60 text-[5px] sm:text-[7px] font-black uppercase tracking-wider rounded-md leading-none">
                            📍 Petak {group.position === 0 ? "START" : group.position}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-lg font-black text-white">{group.score}</span>
                      <p className="text-[5px] sm:text-[8px] font-bold text-white/30 uppercase">Poin</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Navigation Button */}
            {isMidGame && onClose ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={isMobile ? { duration: 0.15 } : { delay: 0.3 }}
                onClick={onClose}
                className="w-full py-2.5 sm:py-3.5 bg-white text-slate-900 rounded-xl font-black tracking-widest uppercase text-[10px] sm:text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl hover:shadow-[0_20px_50px_rgba(255,255,255,0.15)] cursor-pointer flex-shrink-0"
              >
                Tutup Papan Skor
              </motion.button>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={isMobile ? { duration: 0.15 } : { delay: 0.4 }}
                onClick={() => {
                  if (onNavigateBack) {
                    onNavigateBack();
                  }
                  router.push(role === "guru" ? "/dashboard" : "/lobby");
                }}
                className="w-full py-2.5 sm:py-3.5 bg-white text-slate-900 rounded-xl font-black tracking-widest uppercase text-[10px] sm:text-xs hover:scale-[1.02] transition-transform shadow-2xl cursor-pointer flex-shrink-0"
              >
                {role === "guru" ? "Kembali ke Dashboard" : "Kembali ke Lobby"}
              </motion.button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
