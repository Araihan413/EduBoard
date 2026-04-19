"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useGameStore } from "../../../store/gameStore";
import { Timer, Trophy, LogOut, Disc3, Award, ScrollText, CheckCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const BoardCanvas = dynamic(() => import("../../../components/game/BoardCanvas"), { ssr: false });

export default function BoardPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Memuat Papan...</div>}>
      <BoardPage />
    </Suspense>
  )
}

function BoardPage() {
  const searchParams = useSearchParams();
  const role = searchParams?.get('role') || 'siswa';

  const { 
    groups, activeGroupIndex, timer, currentTurn, gameStatus, winner, roomCode,
    isTimerRunning, decrementTimer, drawCard, currentCard, 
    submitAnswerObjektif, submitAnswerSubjektif, nextTurn, pendingReviews
  } = useGameStore();

  const [tantanganText, setTantanganText] = useState("");
  const activeGroup = groups[activeGroupIndex];
  
  // Check if active group is currently under review
  const isUnderReview = pendingReviews.some(r => r.groupId === activeGroup?.id);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer > 0 && gameStatus === 'PLAYING') {
      interval = setInterval(() => {
        decrementTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer, decrementTimer, gameStatus]);

  // Confetti when game finishes
  useEffect(() => {
    if (gameStatus === 'FINISHED') {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [gameStatus]);

  if (!activeGroup && gameStatus !== 'FINISHED') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <Disc3 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold">Mempersiapkan Papan...</h2>
        <p className="text-zinc-500 mt-2">Menunggu Guru untuk mengklik &quot;Mulai Permainan&quot; di Dashboard.</p>
        <Link href="/dashboard" className="mt-8 text-blue-500 hover:underline">Ke Dashboard Guru</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans select-none overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] relative">
      
      {/* Background ambient lighting */}
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
        currentCard ? 'bg-orange-600/20' : 
        activeGroupIndex === 0 ? 'bg-blue-600/20' : 
        activeGroupIndex === 1 ? 'bg-red-600/20' : 'bg-purple-600/20'
      }`} />

      {/* HUD Bar */}
      <div className="h-16 flex items-center justify-between px-6 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800 shadow-xl z-20 text-white relative">
        <div className="flex bg-zinc-950 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide border border-zinc-800">
          <span className="text-zinc-500 mr-2">ROOM</span>
          <span className="text-emerald-400">{roomCode}</span>
        </div>
        
        {gameStatus === 'PLAYING' && (
          <div className="flex-1 flex justify-center items-center gap-6">
            <div className="flex items-center bg-zinc-900 px-5 py-2 rounded-2xl border border-zinc-800">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-4">Giliran</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                <span className="font-extrabold text-base tracking-wide text-zinc-100">{activeGroup.name}</span>
              </div>
            </div>
            
            {/* Timer Area */}
            <div className="flex items-center justify-center bg-zinc-950 px-6 py-2 rounded-2xl border border-zinc-800 relative overflow-hidden shadow-inner">
              <Timer className={`w-5 h-5 mr-3 ${timer <= 10 && timer > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`} />
              <span className={`text-3xl font-mono font-black ${timer <= 10 && timer > 0 ? 'text-red-500' : 'text-white'}`}>
                {timer}
              </span>
              <span className="text-xs font-bold text-zinc-600 ml-1 mt-2">s</span>
              {isTimerRunning && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000 ease-linear" style={{ width: `${(timer / 30) * 100}%` }} />
              )}
            </div>
          </div>
        )}

        {role === 'guru' ? (
          <Link href="/dashboard" className="flex items-center px-4 py-2 hover:bg-yellow-500/10 rounded-full text-yellow-500 transition-colors border border-transparent hover:border-yellow-500/20 font-bold text-sm">
            &larr; DASHBOARD
          </Link>
        ) : (
          <Link href="/lobby" className="hover:bg-red-500/10 p-3 rounded-full text-zinc-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20">
            <LogOut className="w-5 h-5" />
          </Link>
        )}
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex w-full relative z-10">
        
        {/* Render Canvas Papan Permainan */}
        <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
          
          <div className={`transition-all duration-700 ease-in-out ${currentCard || gameStatus === 'FINISHED' ? 'scale-90 opacity-40 blur-sm pointer-events-none' : 'scale-100 opacity-100'}`}>
            <BoardCanvas groups={groups} />
          </div>

          {/* Central Interactions Overlay */}
          <AnimatePresence>
            {gameStatus === 'PLAYING' && !currentCard && timer > 0 && !isUnderReview && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                {role === 'siswa' ? (
                  <button 
                    onClick={drawCard}
                    className="pointer-events-auto group relative flex flex-col items-center justify-center px-12 py-8 bg-zinc-900/90 backdrop-blur-lg border border-zinc-700 rounded-[2rem] shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:shadow-[0_0_80px_rgba(59,130,246,0.5)] transition-all hover:-translate-y-2 active:translate-y-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <ScrollText className="w-16 h-16 text-blue-400 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    <span className="text-3xl font-black text-white tracking-widest uppercase relative z-10">
                      Ambil Kartu
                    </span>
                    <p className="text-zinc-400 mt-3 font-semibold text-sm relative z-10">Giliran {activeGroup.name}</p>
                  </button>
                ) : (
                  <div className="px-12 py-8 bg-zinc-900/90 backdrop-blur-lg border border-zinc-700 rounded-[2rem] text-center">
                    <span className="text-xl font-bold text-zinc-400 tracking-widest uppercase block mb-2">Mode Pengawas</span>
                    <p className="text-zinc-500 font-medium">Siswa sedang berinteraksi di ruangannya...</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Question Modal */}
            {currentCard && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                className="absolute inset-0 flex items-center justify-center p-6 bg-zinc-950/60 backdrop-blur-sm z-50"
              >
                <div className="max-w-2xl w-full bg-zinc-900/95 border border-zinc-700 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden text-center">
                  <div className={`absolute top-0 right-0 w-2 h-full ${currentCard.type === 'DASAR' ? 'bg-blue-500' : currentCard.type === 'AKSI' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                  
                  <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 ${
                    currentCard.type === 'DASAR' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 
                    currentCard.type === 'AKSI' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 
                    'bg-red-500/20 text-red-400 border border-red-500/20'
                  }`}>
                    KARTU {currentCard.type}
                  </span>

                  <h2 className="text-3xl font-bold text-white mb-2 leading-relaxed">{currentCard.text}</h2>
                  <p className="text-zinc-500 font-semibold mb-8 text-sm">Poin Potensial: {currentCard.points > 0 ? `+${currentCard.points}` : currentCard.points}</p>

                  <div className="space-y-4 max-w-lg mx-auto">
                    {role === 'siswa' ? (
                       currentCard.type === 'DASAR' && currentCard.options ? (
                         currentCard.options.map((opt, i) => (
                           <button 
                             key={i}
                             onClick={() => submitAnswerObjektif(activeGroup.id, opt)}
                             className="w-full text-left px-8 py-5 rounded-2xl bg-zinc-800 border-2 border-zinc-700 text-lg font-bold text-white hover:bg-blue-600 hover:border-blue-500 transition-colors flex items-center justify-between group"
                           >
                             {opt}
                             <CheckCircle className="w-5 h-5 opacity-0 group-hover:opacity-100 text-blue-200" />
                           </button>
                         ))
                       ) : currentCard.type === 'TANTANGAN' ? (
                          <div className="space-y-4">
                            <textarea 
                              autoFocus
                              className="w-full min-h-[120px] bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 text-white text-lg focus:outline-none focus:border-orange-500" 
                              placeholder="Ketik jawabanmu di sini..."
                              value={tantanganText}
                              onChange={(e) => setTantanganText(e.target.value)}
                            ></textarea>
                            <button 
                              onClick={() => { submitAnswerSubjektif(activeGroup.id, tantanganText); setTantanganText(""); }}
                              disabled={!tantanganText.trim()}
                              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-black tracking-wide hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] disabled:opacity-50 transition-all"
                            >
                              KIRIM JAWABAN KE GURU
                            </button>
                          </div>
                       ) : (
                         <button 
                           onClick={() => submitAnswerObjektif(activeGroup.id, 'SELESAI')}
                           className="w-full py-5 rounded-2xl bg-zinc-100 text-zinc-900 text-lg font-black tracking-wide hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all"
                         >
                           OK, AKSI DIJALANKAN
                         </button>
                       )
                    ) : (
                       <div className="p-8 bg-zinc-950 border border-zinc-800 text-center rounded-2xl">
                          <p className="text-zinc-500 font-bold uppercase tracking-widest">Siswa sedang membaca pertanyaan di perambannya...</p>
                       </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Loading Review State */}
            {isUnderReview && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-sm z-40 text-center"
               >
                 <Disc3 className="w-20 h-20 text-orange-500 animate-spin mb-6" />
                 <h2 className="text-3xl font-black text-white px-8">Menunggu Penilaian Guru...</h2>
                 <p className="text-zinc-400 mt-4 h-8">Jawaban kamu sedang dibaca di layar panduan Guru.</p>
               </motion.div>
            )}

            {/* Winner Screen */}
            {gameStatus === 'FINISHED' && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-xl z-50 text-center"
              >
                <div className="bg-gradient-to-tr from-yellow-500/20 to-amber-500/20 p-8 rounded-full mb-8 border border-yellow-500/30">
                  <Award className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                </div>
                <h1 className="text-6xl font-black text-white tracking-widest uppercase drop-shadow-xl mb-4">
                  PERMAINAN SELESAI
                </h1>
                {winner && (
                  <p className="text-3xl text-zinc-300 font-bold max-w-2xl">
                    Pemenangnya adalah <span className="text-emerald-400">{winner.name}</span> dengan Skor <span className="text-emerald-400">{winner.score}</span>!
                  </p>
                )}
                
                <Link href="/dashboard" className="mt-12 px-8 py-4 rounded-full bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-zinc-700 transition-all">
                  KEMBALI KE DASHBOARD
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Side Panel: Leaderboard & Controls */}
        <div className="w-96 bg-zinc-900/95 border-l border-zinc-800 flex flex-col shadow-2xl relative z-20">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
            <h2 className="text-lg font-black flex items-center text-white tracking-wide">
              <Trophy className="w-5 h-5 text-yellow-500 mr-2" /> LEADERBOARD
            </h2>
            <span className="text-xs bg-zinc-800 text-emerald-400 border border-zinc-700 font-bold px-3 py-1 rounded-lg">Turn {currentTurn}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {groups.map((g, i) => (
              <div key={g.id} className={`p-5 rounded-2xl border-2 transition-all duration-300 bg-zinc-950/50 relative overflow-hidden ${activeGroupIndex === i && gameStatus !== 'FINISHED' ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-emerald-500/5 -translate-y-1' : 'border-zinc-800'}`}>
                {activeGroupIndex === i && gameStatus !== 'FINISHED' && (
                   <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500"></div>
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className={`font-bold text-sm tracking-wide ${activeGroupIndex === i && gameStatus !== 'FINISHED' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                    {g.name}
                  </span>
                  <span className="text-2xl font-black font-mono text-white">{g.score}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-zinc-500 tracking-widest bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">Petak {g.position}</span>
                  {g.status === 'SKIP_NEXT' && (
                    <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">Sanksi Lewat</span>
                  )}
                </div>
              </div>
            ))}

            {/* Simulasi Next Turn Button (hanya jika waktu habis dan gaada kartu) */}
             {gameStatus === 'PLAYING' && !currentCard && role === 'guru' &&  (
               <div className="mt-8 pt-6 border-t border-zinc-800">
                  <button 
                    onClick={nextTurn}
                    className="w-full py-4 text-xs tracking-widest uppercase bg-red-950/40 text-red-500 font-bold rounded-xl hover:bg-red-900 transition-all border border-red-900/50"
                  >
                    Paksa Pindah Giliran
                  </button>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
