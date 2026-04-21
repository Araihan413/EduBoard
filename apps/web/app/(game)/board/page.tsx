"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  useGameStore,
  socket,
  type QuestionCard,
  type Group,
  type PendingReview,
  type AnswerResult,
} from "../../../store/gameStore";
import {
  Timer,
  LogOut,
  Disc3,
  Award,
  ScrollText,
  BookOpen,
  Target,
  Flame,
  Moon,
  Info,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const BoardCanvas = dynamic(
  () => import("../../../components/game/BoardCanvas"),
  { ssr: false },
);

const TeacherReviewPanel = dynamic(
  () => import("../../../components/game/TeacherReviewPanel"),
  { ssr: false },
);

const ResultNotification = ({ result, onClose }: { result: AnswerResult; onClose: () => void }) => {
  const isSuccess = result.type === 'SUCCESS';
  const isFailure = result.type === 'FAILURE';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 pointer-events-none"
    >
      <div className="bg-white/95 backdrop-blur-3xl border-2 border-slate-100 rounded-[2.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.15)] flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden pointer-events-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`absolute inset-0 opacity-10 blur-3xl pointer-events-none ${isSuccess ? 'bg-emerald-500' : isFailure ? 'bg-red-500' : 'bg-blue-500'}`} />
        
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border-4 border-white shadow-2xl ${isSuccess ? 'bg-emerald-500' : isFailure ? 'bg-red-500' : 'bg-blue-500'}`}>
          {isSuccess ? <CheckCircle2 className="w-12 h-12 text-white" /> : isFailure ? <XCircle className="w-12 h-12 text-white" /> : <Award className="w-12 h-12 text-white" />}
        </div>
        
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">{result.groupName}</p>
        <h2 className={`text-4xl font-black tracking-tighter mb-4 ${isSuccess ? 'text-emerald-600' : isFailure ? 'text-red-600' : 'text-blue-600'}`}>
          {result.title}
        </h2>
        <p className="text-lg font-bold text-slate-600 leading-relaxed mb-6">
          {result.message}
        </p>
        
        <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">POIN DIDAPAT:</span>
          <span className={`text-xl font-black ${isSuccess ? 'text-emerald-600' : 'text-slate-900'}`}>{result.points > 0 ? `+${result.points}` : result.points}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Card Animation State Machine
type CardPhase = "idle" | "drawing" | "revealed" | "returning";

// Wrapper for Suspense
export default function BoardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white bg-grid flex items-center justify-center text-slate-900 font-black">
          <Disc3 className="w-10 h-10 text-[#2c49c5] animate-spin mb-4" />
          Memuat Papan...
        </div>
      }
    >
      <BoardPage />
    </Suspense>
  );
}

// Main Board Page
function BoardPage() {
  const searchParams = useSearchParams();
  const role = searchParams?.get("role") || "siswa";

  const {
    groups,
    activeGroupIndex,
    timer,
    globalTimer,
    roomConfig,
    gameStatus,
    winner,
    roomCode,
    isTimerRunning,
    isGlobalTimerRunning,
    currentCard,
    myGroupName,
    submitAnswerObjektif,
    submitAnswerSubjektif,
    gradeSubjektif,
    nextTurn,
    pendingReviews,
    rollDice,
    isRolling,
    diceValue,
    isMoving,
    joinRoom,
    lastResult,
    clearLastResult,
  } = useGameStore();

  const [tantanganText, setTantanganText] = useState("");

  // State Machine
  const [stickyCardData, setStickyCardData] = useState<QuestionCard | null>(null);
  const [cardPhase, setCardPhase] = useState<CardPhase>("idle");
  const cardPhaseRef = useRef<CardPhase>("idle");

  if (currentCard && currentCard !== stickyCardData) {
    setStickyCardData(currentCard);
  }

  const updatePhase = (phase: CardPhase) => {
    cardPhaseRef.current = phase;
    setCardPhase(phase);
  };

  useEffect(() => {
    const curr = currentCard;
    const phase = cardPhaseRef.current;

    if (curr) {
      if (phase === "idle") {
        updatePhase("drawing");
        const t = setTimeout(() => updatePhase("revealed"), 550);
        return () => clearTimeout(t);
      }
    } else if (!curr && (phase === "revealed" || phase === "drawing")) {
      updatePhase("returning");
      const t = setTimeout(() => {
        setStickyCardData(null);
        updatePhase("idle");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [currentCard]);

  useEffect(() => {
    if (gameStatus !== "FINISHED") return;
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#2c49c5", "#ffda59", "#ef4444"] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#2c49c5", "#ffda59", "#ef4444"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [gameStatus]);

  useEffect(() => {
    const queryRoom = searchParams?.get("roomCode");
    const queryRole = searchParams?.get("role");

    if (queryRoom && !roomCode) {
      if (queryRole === "guru") {
        socket?.emit("room:join", { roomCode: queryRoom, role: "guru" });
      } else {
        const savedName = localStorage.getItem(`eduboard_name_${queryRoom}`);
        if (savedName) {
          joinRoom(queryRoom, savedName);
        } else {
          socket?.emit("room:join", { roomCode: queryRoom, role: "siswa" });
        }
      }
    }
  }, [searchParams, roomCode, joinRoom]);

  // Auto-clear last result
  useEffect(() => {
    if (lastResult) {
      const t = setTimeout(() => {
        clearLastResult();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [lastResult, clearLastResult]);

  const activeGroup = groups[activeGroupIndex];
  const isUnderReview = pendingReviews.some((r) => r.groupId === activeGroup?.id);
  const displayCard = currentCard ?? stickyCardData;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const isCardActive = cardPhase !== "idle";

  if (!activeGroup && gameStatus !== "FINISHED" && gameStatus !== "IDLE") {
    return (
      <div className="min-h-screen bg-white bg-grid flex flex-col items-center justify-center p-6 text-slate-900 text-center">
        <div className="relative mb-10">
           <Disc3 className="w-20 h-20 text-[#2c49c5] animate-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#ffda59] rounded-full shadow-[0_0_8px_#ffda59]" />
           </div>
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-4">Mempersiapkan Papan...</h2>
        <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
          Menunggu Guru untuk mengklik &quot;Mulai Permainan&quot; di Dashboard.
        </p>
        {role === "guru" && (
          <Link href="/dashboard" className="mt-10 px-8 py-3 bg-[#2c49c5] text-white font-black rounded-2xl shadow-xl shadow-[#2c49c5]/20 hover:scale-105 transition-all">
            Ke Dashboard Guru
          </Link>
        )}
      </div>
    );
  }

  if (!roomCode && gameStatus === "IDLE") {
    return (
       <div className="min-h-screen bg-white bg-grid flex flex-col items-center justify-center p-6 text-slate-900 text-center font-black">
         <Disc3 className="w-12 h-12 text-[#2c49c5] animate-spin mb-6" />
         <h2 className="text-xl text-slate-400">Menghubungkan Kembali...</h2>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans select-none overflow-hidden relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid opacity-100 pointer-events-none" />
      
      {/* Dynamic ambient background glow - Light themed */}
      <div className={`absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none transition-colors duration-1000 opacity-20 ${
        isCardActive ? "bg-orange-400" :
        activeGroupIndex === 0 ? "bg-blue-400" :
        activeGroupIndex === 1 ? "bg-red-400" : "bg-purple-400"
      }`} />

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <header className="h-20 flex items-center justify-between px-10 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm z-50 text-slate-900 relative">
        <div className="flex bg-slate-50 px-5 py-2.5 rounded-2xl text-sm font-black tracking-tight border border-slate-100 shadow-inner">
          <span className="text-slate-400 mr-3">ROOM</span>
          <span className="text-[#2c49c5] font-mono tracking-widest">{roomCode}</span>
        </div>

        {/* Monitoring Mode Badge (Centered) */}
        {role === "guru" && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full shadow-sm animate-pulse z-10">
            <div className="w-1.5 h-1.5 bg-[#2c49c5] rounded-full" />
            <span className="text-[9px] font-black text-[#2c49c5] uppercase tracking-[0.2em] whitespace-nowrap">
              📡 Mode Memantau
            </span>
          </div>
        )}

        {activeGroup && (
          <div className="flex items-center gap-10">
            {/* Answer Timer */}
            <AnimatePresence>
              {isTimerRunning && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col items-end border-r border-slate-100 pr-10"
                >
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Waktu Menjawab</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-3xl font-black font-mono leading-none ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                      {timer}<span className="text-xs ml-0.5 opacity-50">s</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col items-center">
              <span className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Giliran Aktif</span>
              <div className="flex items-center gap-4 bg-white px-5 py-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffda59] shadow-[0_0_8px_#ffda59] animate-pulse" />
                <span className="font-black text-lg tracking-tight text-[#2c49c5]">{activeGroup.name}</span>
              </div>
            </div>

            {/* Global Session Timer */}
            <div className="flex items-center justify-center bg-slate-900 px-8 py-3 rounded-2xl border-b-4 border-slate-950 relative overflow-hidden shadow-2xl min-w-[160px] group">
              <Timer className={`w-5 h-5 mr-3 group-hover:rotate-12 transition-transform ${globalTimer <= 60 && globalTimer > 0 ? "text-yellow-400 animate-pulse" : "text-slate-500"}`} />
              <span className={`text-3xl font-mono font-black ${globalTimer <= 60 && globalTimer > 0 ? "text-yellow-400" : "text-white"}`}>
                {formatTime(globalTimer)}
              </span>
              {isGlobalTimerRunning && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-[#2c49c5] transition-all duration-1000 ease-linear shadow-[0_0_10px_#2c49c5]"
                  style={{ width: `${(globalTimer / (roomConfig?.gameDurationSec || 600)) * 100}%` }}
                />
              )}
            </div>
          </div>
        )}

        {role === "guru" ? (
          <Link href="/dashboard" className="flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-black text-xs tracking-widest shadow-xl shadow-slate-900/20">
            KONTROL PANEL &rarr;
          </Link>
        ) : (
          <Link href="/lobby" className="bg-red-50 p-3.5 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm">
            <LogOut className="w-5 h-5" />
          </Link>
        )}
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col xl:flex-row w-full relative z-10 p-4 lg:p-8 gap-6 lg:gap-10 overflow-x-hidden overflow-y-auto xl:overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-full xl:w-72 flex flex-col gap-6 relative h-max">
          {/* Legend Popover */}
          <div className="relative group/legend">
            <button className="w-full flex items-center justify-between bg-white border-2 border-slate-100 px-6 py-4 rounded-[2rem] shadow-xl shadow-slate-200/40 hover:border-[#2c49c5] transition-all group">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#2c49c5] shadow-sm border border-blue-100">
                   <Info className="w-6 h-6" />
                 </div>
                 <span className="text-sm font-black text-slate-900 tracking-tight">Keterangan</span>
              </div>
              <ScrollText className="w-4 h-4 text-slate-300 group-hover:text-[#2c49c5]" />
            </button>
            <div className="absolute top-full left-0 mt-4 w-full bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-2xl shadow-slate-300/40 opacity-0 scale-95 pointer-events-none group-hover/legend:opacity-100 group-hover/legend:scale-100 group-hover/legend:pointer-events-auto transition-all duration-300 origin-top-left z-50">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Misi EduBoard</h3>
              <div className="space-y-5">
                <LegendItem icon={<BookOpen className="w-5 h-5 text-blue-600" />} color="text-slate-700" label="Kartu Dasar" />
                <LegendItem icon={<Target className="w-5 h-5 text-red-600" />} color="text-slate-700" label="Kartu Aksi" />
                <LegendItem icon={<Flame className="w-5 h-5 text-orange-600" />} color="text-slate-700" label="Kartu Tantangan" />
                <LegendItem icon={<Moon className="w-5 h-5 text-purple-600" />} color="text-slate-700" label="Skip Putaran" />
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 flex-1 pb-10 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
               <Award className="w-4 h-4 text-[#ffda59]" /> Papan Skor
            </h3>
            <div className="space-y-5">
              {[...groups]
                .map((g, i) => ({ ...g, originalIndex: i }))
                .sort((a, b) => b.score - a.score)
                .map((g, rank) => (
                  <div key={g.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm border ${rank === 0 ? "bg-yellow-50 text-yellow-600 border-yellow-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                        {rank + 1}
                      </div>
                      <div className="flex flex-col">
                         <span className={`text-sm font-black tracking-tight ${activeGroupIndex === g.originalIndex ? "text-[#2c49c5]" : "text-slate-600"}`}>
                           {g.name}
                         </span>
                         <div className={`h-1 w-8 rounded-full mt-1 ${g.originalIndex === 0 ? "bg-blue-500" : g.originalIndex === 1 ? "bg-red-500" : g.originalIndex === 2 ? "bg-purple-500" : "bg-emerald-500"}`} />
                      </div>
                    </div>
                    <span className="text-base font-black text-slate-900 group-hover:scale-110 transition-transform">{g.score}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Center Board Area */}
        <div className="flex-1 relative flex items-center justify-center min-h-[600px] bg-white rounded-[4rem] border border-slate-50 shadow-inner overflow-hidden">
          <BoardCanvas groups={groups} />
          
          {/* Floating UI Elements on Board */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <Dice
              size={130}
              value={diceValue}
              isRolling={isRolling}
              onClick={() => {
                if (role === "siswa" && activeGroup.name === myGroupName && !isRolling && !isMoving && !currentCard) {
                  rollDice();
                }
              }}
              isMyTurn={role === "siswa" && activeGroup.name === myGroupName && !isRolling && !isMoving && !currentCard}
            />
          </div>

          <AnimatePresence>
            {gameStatus === "PLAYING" && !currentCard && timer > 0 && !isUnderReview && !isCardActive && !lastResult && (
              <motion.div
                key="turn-indicator"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 px-10 py-4 bg-white/90 backdrop-blur-xl border border-slate-100 rounded-full flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-30"
              >
                {role === "siswa" && activeGroup.name === myGroupName ? (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-[#2c49c5] animate-ping" />
                    <span className="text-[#2c49c5] font-black tracking-widest text-xs uppercase">GILIRAN KAMU: KLIK DADU!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-400 tracking-widest uppercase">
                      {role === "siswa" ? "MENUNGGU LAWAN" : "MODE PEMANTAU"}
                    </span>
                    <div className="w-px h-4 bg-slate-100" />
                    <p className="text-[#2c49c5] font-black text-sm italic">{activeGroup.name} Sedang Jalan...</p>
                  </div>
                )}
              </motion.div>
            )}

            {isUnderReview && (
              <motion.div
                key="review-indicator"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute z-50 flex items-center pointer-events-none rounded-[3rem] ${
                  role === "siswa" && activeGroup.name === myGroupName
                    ? "inset-0 flex-col justify-center p-10 bg-white/95 text-center"
                    : "top-32 left-1/2 -translate-x-1/2 bg-white px-8 py-4 border-2 border-[#ffda59] gap-4 shadow-2xl"
                }`}
              >
                <div className="relative">
                   <Disc3 className={`text-[#2c49c5] animate-spin ${role === "siswa" && activeGroup.name === myGroupName ? "w-24 h-24 mb-10" : "w-6 h-6"}`} />
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-2 h-2 bg-[#ffda59] rounded-full shadow-[0_0_10px_#ffda59]" />
                   </div>
                </div>
                {role === "siswa" && activeGroup.name === myGroupName ? (
                  <div className="max-w-md">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Jawaban Terkirim!</h2>
                    <p className="text-slate-500 text-lg font-medium">Harap tenang, Guru sedang memberikan nilai untuk aksimu.</p>
                  </div>
                ) : (
                  <p className="text-slate-900 font-black text-sm tracking-tight">Guru sedang menilai {activeGroup.name}...</p>
                )}
              </motion.div>
            )}

            {gameStatus === "FINISHED" && (
              <motion.div
                key="victory"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-white/98 backdrop-blur-2xl z-[100] text-center"
              >
                 {/* Yellow Detail */}
                <div className="absolute top-0 left-0 w-full h-3 bg-[#ffda59]" />

                <div className="relative group mb-12">
                   <div className="absolute inset-0 bg-[#ffda59]/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
                   <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl relative border border-yellow-50">
                      <Award className="w-32 h-32 text-[#ffda59] filter drop-shadow-2xl" />
                   </div>
                </div>
                
                <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase mb-6">MISI BERHASIL!</h1>
                {winner && (
                  <div className="space-y-4">
                    <p className="text-2xl text-slate-500 font-bold max-w-2xl mx-auto">
                      Selamat kepada tim <span className="text-[#2c49c5] font-black underline decoration-yellow-400 decoration-4 underline-offset-8">{winner.name}</span>
                    </p>
                    <div className="inline-block bg-[#2c49c5] text-white px-8 py-3 rounded-2xl font-black text-3xl shadow-2xl shadow-[#2c49c5]/30">
                       SKOR {winner.score}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-6 mt-16">
                  {role === "guru" ? (
                    <Link href="/dashboard" className="px-12 py-5 rounded-[2rem] bg-[#2c49c5] text-white font-black hover:bg-[#1a34a8] transition-all shadow-2xl shadow-[#2c49c5]/30 text-lg active:scale-95">
                      KE DASHBOARD ADMIN
                    </Link>
                  ) : (
                    <Link href="/lobby" className="px-12 py-5 rounded-[2rem] bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 text-lg active:scale-95">
                      KEMBALI KE LOBBY
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar — Card Decks */}
        <div className="w-full xl:w-80 flex flex-col gap-6 relative">
          <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-2xl shadow-slate-200/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-12 text-center">
              Bank Kartu
            </h3>
            <div className="flex flex-col items-center gap-14 pb-4">
              <PhysicalDeck
                type="DASAR"
                label="Misi Dasar"
                isDrawn={isCardActive && displayCard?.type === "DASAR"}
              />
              <PhysicalDeck
                type="AKSI"
                label="Misi Aksi"
                isDrawn={isCardActive && displayCard?.type === "AKSI"}
              />
              <PhysicalDeck
                type="TANTANGAN"
                label="Misi Tantangan"
                isDrawn={isCardActive && displayCard?.type === "TANTANGAN"}
              />
            </div>
          </div>

          {role === "guru" && !currentCard && !isCardActive && (
            <button
              onClick={nextTurn}
              className="w-full py-6 bg-slate-900 text-white font-black text-xs tracking-[0.3em] uppercase rounded-[2rem] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 border-b-4 border-slate-950"
            >
              SKIP KE GILIRAN BERIKUTNYA &rarr;
            </button>
          )}
        </div>
      </div>

      <CardOverlay
        phase={cardPhase}
        displayCard={displayCard}
        currentCard={currentCard}
        isUnderReview={isUnderReview}
        isTimerRunning={isTimerRunning}
        timer={timer}
        role={role}
        activeGroup={activeGroup}
        myGroupName={myGroupName}
        tantanganText={tantanganText}
        setTantanganText={setTantanganText}
        submitAnswerObjektif={submitAnswerObjektif}
        submitAnswerSubjektif={submitAnswerSubjektif}
        gradeSubjektif={gradeSubjektif}
        pendingReviews={pendingReviews}
      />

      <AnimatePresence>
        {lastResult && (
          <ResultNotification result={lastResult} onClose={clearLastResult} />
        )}
      </AnimatePresence>

      {/* Real-time Teacher Review Panel */}
      {role === "guru" && (
        <TeacherReviewPanel 
          pendingReviews={pendingReviews} 
          onGrade={gradeSubjektif} 
        />
      )}
    </div>
  );
}

// ─── Physical Card Deck ────────────────────────────────────────────────────────
function PhysicalDeck({
  type,
  label,
  isDrawn,
}: {
  type: string;
  label: string;
  isDrawn: boolean;
}) {
  const accent =
    type === "DASAR" ? { bg: "bg-[#2c49c5]", text: "text-[#2c49c5]", border: "border-[#2c49c5]/40", glow: "rgba(44,73,197,0.15)" } :
    type === "AKSI" ? { bg: "bg-[#ef4444]", text: "text-[#ef4444]", border: "border-[#ef4444]/40", glow: "rgba(239,68,68,0.15)" } :
    { bg: "bg-[#f59e0b]", text: "text-[#f59e0b]", border: "border-[#f59e0b]/40", glow: "rgba(245,158,11,0.15)" };

  return (
    <div className="relative group" style={{ width: 120, height: 170 }}>
      {/* Shadow layers — simulation of stacked cards in light theme */}
      <div className="absolute inset-0 translate-x-3 translate-y-3 bg-slate-100 rounded-[20px] border border-slate-200/50 shadow-sm" />
      <div className="absolute inset-0 translate-x-2 translate-y-2 bg-slate-50 rounded-[20px] border border-slate-200/50 shadow-sm" />
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-white rounded-[20px] border border-slate-100/50 shadow-sm" />

      {/* Base card */}
      <div className="absolute inset-0 rounded-[20px] overflow-hidden shadow-sm">
        <CardBackFace type={type} />
      </div>

      {/* Top card animate */}
      <motion.div
        className="absolute inset-0 rounded-[20px] overflow-hidden shadow-xl"
        animate={isDrawn ? { opacity: 0, y: -12, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
        transition={isDrawn
          ? { duration: 0.3, ease: "easeOut" }
          : { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] as any }
        }
        style={{ boxShadow: isDrawn ? 'none' : `0 15px 35px -5px ${accent.glow}` }}
      >
        <CardBackFace type={type} />
      </motion.div>

      <div className="absolute -top-6 left-0 right-0 flex items-center justify-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${accent.text}`}>{label}</span>
      </div>
    </div>
  );
}

// ─── Card Back Face (shared design for deck and overlay) ──────────────────────
function CardBackFace({ type }: { type: string }) {
  const accent =
    type === "DASAR" ? "bg-[#2c49c5]" :
    type === "AKSI" ? "bg-[#ef4444]" : "bg-[#f59e0b]";

  const Icon = type === "DASAR" ? BookOpen : type === "AKSI" ? Target : Flame;

  return (
    <div className="absolute inset-0 bg-white border-2 border-slate-100 rounded-[20px] flex flex-col items-center justify-center overflow-hidden">
      {/* Pattern Detail */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(#2c49c5 0.5px, transparent 0.5px)", backgroundSize: "12px 12px" }} />
      
      {/* Corner Details */}
      <div className={`absolute top-4 left-4 w-2 h-2 rounded-full ${accent} opacity-20`} />
      <div className={`absolute bottom-4 right-4 w-2 h-2 rounded-full ${accent} opacity-20`} />

      <div className={`w-14 h-14 rounded-2xl ${accent} flex items-center justify-center shadow-lg shadow-slate-200 mb-4`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <span className="text-[8px] font-black tracking-[0.6em] text-slate-300 uppercase">EDUBOARD</span>
      
      {/* Inner Frame */}
      <div className="absolute inset-3 border border-slate-50 rounded-[14px] pointer-events-none" />
    </div>
  );
}

interface CardOverlayProps {
  phase: CardPhase;
  displayCard: QuestionCard | null;
  currentCard: QuestionCard | null;
  isUnderReview: boolean;
  isTimerRunning: boolean;
  timer: number;
  role: string;
  activeGroup: Group | undefined;
  myGroupName: string | null;
  tantanganText: string;
  setTantanganText: (v: string) => void;
  submitAnswerObjektif: (groupId: string, answer: string) => void;
  submitAnswerSubjektif: (groupId: string, answerText: string) => void;
  gradeSubjektif: (reviewId: string, score: number) => void;
  pendingReviews: PendingReview[];
}

function CardOverlay({
  phase,
  displayCard,
  currentCard,
  isUnderReview,
  isTimerRunning,
  timer,
  role,
  activeGroup,
  myGroupName,
  tantanganText,
  setTantanganText,
  submitAnswerObjektif,
  submitAnswerSubjektif,
  gradeSubjektif,
  pendingReviews,
}: CardOverlayProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (phase === "revealed") {
      const t = setTimeout(() => setIsFlipped(true), 80);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const flipped = phase === "revealed" ? isFlipped : false;
  const cardType = displayCard?.type ?? "DASAR";
  const isVisible = phase !== "idle";

  const positionVariants = {
    hidden: { x: 300, y: 150, scale: 0.3, opacity: 0 },
    drawing: { x: 0, y: 0, scale: 1, opacity: 1 },
    revealed: { x: 0, y: 0, scale: 1, opacity: 1 },
    returning: { x: 300, y: 150, scale: 0.3, opacity: 0 },
  };

  const getPositionTarget = () => {
    if (phase === "returning") return "returning";
    if (phase === "drawing" || phase === "revealed") return "drawing";
    return "hidden";
  };

  const getPositionTransition = () => {
    if (phase === "drawing") return { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] } as any;
    if (phase === "returning") return { duration: 0.5, ease: "easeInOut", delay: 0.2 } as any;
    return { duration: 0.3 } as any;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ pointerEvents: phase === "drawing" ? "none" : "auto" }}
        >
          {/* Light Theme Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "returning" ? 0 : 1 }}
            transition={{ duration: 0.4 }}
          />

          <motion.div
            className="relative z-10"
            style={{ perspective: 1500, width: 400, maxWidth: "100%" }}
            variants={positionVariants}
            initial="hidden"
            animate={getPositionTarget()}
            transition={getPositionTransition()}
          >
            <motion.div
              className="w-full relative"
              style={{ height: 560, transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
            >
              {/* BACK FACE */}
              <div
                className="absolute inset-0"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <div
                  className="absolute inset-0 bg-white border-4 border-slate-100 rounded-[3rem] flex flex-col items-center justify-center overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)]"
                >
                   {/* Pattern Detail */}
                  <div className="absolute inset-10 border-2 border-slate-50 rounded-[2rem] flex flex-col items-center justify-center">
                     <div className={`w-24 h-24 rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 ${
                        cardType === "DASAR" ? "bg-[#2c49c5]" :
                        cardType === "AKSI" ? "bg-[#ef4444]" : "bg-[#f59e0b]"
                     }`}>
                        {cardType === "DASAR" && <BookOpen className="w-12 h-12 text-white" />}
                        {cardType === "AKSI" && <Target className="w-12 h-12 text-white" />}
                        {cardType === "TANTANGAN" && <Flame className="w-12 h-12 text-white" />}
                     </div>
                     <span className="text-[10px] font-black tracking-[1em] text-slate-200 uppercase">EDUBOARD</span>
                  </div>
                </div>
              </div>

              {/* FRONT FACE */}
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardFrontFace
                  cardType={cardType}
                  displayCard={displayCard}
                  currentCard={currentCard}
                  isUnderReview={isUnderReview}
                  isTimerRunning={isTimerRunning}
                  timer={timer}
                  role={role}
                  activeGroup={activeGroup}
                  myGroupName={myGroupName}
                  tantanganText={tantanganText}
                  setTantanganText={setTantanganText}
                  submitAnswerObjektif={submitAnswerObjektif}
                  submitAnswerSubjektif={submitAnswerSubjektif}
                  gradeSubjektif={gradeSubjektif}
                  pendingReviews={pendingReviews}
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CardFrontFace({
  cardType,
  displayCard,
  currentCard,
  isUnderReview,
  isTimerRunning,
  timer,
  role,
  activeGroup,
  myGroupName,
  tantanganText,
  setTantanganText,
  submitAnswerObjektif,
  submitAnswerSubjektif,
  gradeSubjektif,
  pendingReviews,
}: {
  cardType: string;
  displayCard: QuestionCard | null;
  currentCard: QuestionCard | null;
  isUnderReview: boolean;
  isTimerRunning: boolean;
  timer: number;
  role: string;
  activeGroup: Group | undefined;
  myGroupName: string | null;
  tantanganText: string;
  setTantanganText: (v: string) => void;
  submitAnswerObjektif: (groupId: string, answer: string) => void;
  submitAnswerSubjektif: (groupId: string, answerText: string) => void;
  gradeSubjektif: (reviewId: string, score: number) => void;
  pendingReviews: PendingReview[];
}) {
  const accentCorner =
    isUnderReview ? "bg-orange-500" :
    cardType === "DASAR" ? "bg-[#2c49c5]" :
    cardType === "AKSI" ? "bg-[#ef4444]" : "bg-[#f59e0b]";

  const accentText =
    isUnderReview ? "text-orange-600" :
    cardType === "DASAR" ? "text-[#2c49c5]" :
    cardType === "AKSI" ? "text-[#ef4444]" : "text-[#f59e0b]";

  return (
    <div
      className="absolute inset-0 bg-white rounded-[3rem] flex flex-col p-10 overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-b-8 border-slate-100"
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 ${accentCorner} opacity-90`}
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
      />

      {isTimerRunning && !isUnderReview && (
        <div className="absolute top-6 right-6 z-20 flex flex-col items-center">
           <div className={`flex items-center justify-center w-14 h-14 rounded-full border-4 border-white shadow-2xl ${timer <= 5 ? 'bg-red-500 animate-pulse' : 'bg-slate-950'}`}>
              <span className="text-2xl font-black text-white font-mono">{timer}</span>
           </div>
           <span className={`text-[9px] font-black uppercase tracking-widest mt-2 ${timer <= 5 ? 'text-red-500' : 'text-slate-400'}`}>Detik Tersisa</span>
        </div>
      )}

      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        <div className="mb-8 pb-6 border-b border-slate-100">
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${accentText}`}>
            {isUnderReview ? "KONFIRMASI GURU" : `MISI ${cardType}`}
          </p>
          {!isUnderReview && displayCard && (
            <div className="flex items-baseline gap-3">
               <span className="text-5xl font-black text-slate-900 tracking-tighter">{displayCard.points}</span>
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Poin Reward</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-hide">
          {isUnderReview ? (
            <div className="space-y-8">
              {pendingReviews
                .filter((r) => r.groupId === activeGroup?.id)
                .map((review) => (
                  <div key={review.id} className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">PERTANYAAN</p>
                      <p className="text-xl font-bold text-slate-900 leading-snug italic">&ldquo;{review.questionText}&rdquo;</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-[#2c49c5]" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                        <ScrollText className="w-4 h-4 text-[#2c49c5]" /> JAWABAN TIM {review.groupName}
                      </p>
                      <p className="text-xl font-black text-[#2c49c5] leading-relaxed break-words">{review.answerText}</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">INSTRUKSI MISI</p>
              <p className="text-2xl font-black text-slate-900 leading-tight mb-8">
                &ldquo;{displayCard?.text}&rdquo;
              </p>

              {role === "siswa" && activeGroup?.name === myGroupName && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  {currentCard?.type === "DASAR" && currentCard.options ? (
                    <div className="grid grid-cols-1 gap-4">
                      {currentCard.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => submitAnswerObjektif(activeGroup.id, opt)}
                          className="w-full text-left px-8 py-5 rounded-2xl border-2 border-slate-100 bg-white text-lg font-black text-slate-900 hover:border-[#2c49c5] hover:text-[#2c49c5] hover:shadow-xl hover:shadow-blue-500/10 transition-all flex justify-between items-center group/opt"
                        >
                          <span>{opt}</span>
                          <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover/opt:bg-blue-50 flex items-center justify-center transition-colors">
                             <div className="w-2 h-2 rounded-full bg-slate-200 group-hover/opt:bg-[#2c49c5]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : currentCard?.type === "TANTANGAN" ? (
                    <div className="space-y-4">
                      <textarea
                        autoFocus
                        className="w-full min-h-[140px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 text-slate-900 text-lg font-bold focus:outline-none focus:border-[#ffda59] focus:ring-8 focus:ring-[#ffda59]/10 shadow-inner resize-none transition-all"
                        placeholder="Tuliskan jawaban yang paling tepat..."
                        value={tantanganText}
                        onChange={(e) => setTantanganText(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          submitAnswerSubjektif(activeGroup.id, tantanganText);
                          setTantanganText("");
                        }}
                        disabled={!tantanganText.trim()}
                        className="w-full py-6 rounded-[2rem] bg-[#2c49c5] text-white font-black tracking-[0.2em] uppercase hover:bg-[#1a34a8] disabled:opacity-20 transition-all shadow-2xl shadow-[#2c49c5]/30 active:scale-95 flex items-center justify-center gap-3"
                      >
                        KIRIM KE GURU <Disc3 className="w-5 h-5 animate-spin opacity-50" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => submitAnswerObjektif(activeGroup.id, "SELESAI")}
                      className="w-full py-6 rounded-[2rem] bg-slate-900 text-white text-lg font-black tracking-widest uppercase hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 active:scale-95 border-b-4 border-slate-950"
                    >
                      MISI SELESAI &rarr;
                    </button>
                  )}
                </div>
              )}

              {(role === "guru" || activeGroup?.name !== myGroupName) && (
                <div className="mt-8 bg-[#2c49c5]/5 border-2 border-[#2c49c5]/10 p-10 rounded-[2.5rem] text-center group">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10 border border-blue-50 group-hover:scale-110 transition-transform">
                     <Disc3 className="w-8 h-8 text-[#2c49c5] animate-[spin_3s_linear_infinite]" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">STATUS TIM</p>
                  <p className="text-xl font-black text-slate-800">MENUNGGU AKSI <span className="text-[#2c49c5]">{activeGroup?.name || "..."}</span></p>
                </div>
              )}
            </div>
          )}
        </div>

        {isUnderReview && (
          <div className="mt-8 pt-8 border-t border-slate-100">
            {role === "guru" ? (
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => gradeSubjektif(pendingReviews.find((r) => r.groupId === activeGroup?.id)!.id, 0)}
                  className="flex flex-col items-center gap-1 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:bg-red-50 hover:border-red-200 transition-all group"
                >
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-red-400">Gagal</span>
                  <span className="font-black text-slate-900 text-[13px] tracking-tight">SALAH</span>
                </button>
                <button
                  onClick={() => {
                    const r = pendingReviews.find((r) => r.groupId === activeGroup?.id)!;
                    gradeSubjektif(r.id, Math.floor(r.maxPoints / 2));
                  }}
                  className="flex flex-col items-center gap-1 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:bg-[#ffda59]/10 hover:border-[#ffda59]/30 transition-all group"
                >
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-yellow-600">Sedang</span>
                  <span className="font-black text-slate-900 text-[13px] tracking-tight">CUKUP</span>
                </button>
                <button
                  onClick={() => {
                    const r = pendingReviews.find((r) => r.groupId === activeGroup?.id)!;
                    gradeSubjektif(r.id, r.maxPoints);
                  }}
                  className="flex flex-col items-center gap-1 p-5 rounded-2xl bg-[#2c49c5] text-white hover:bg-[#1a34a8] transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Sempurna</span>
                  <span className="font-black text-[13px] tracking-tight">HEBAT!</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-100 p-8 rounded-[2rem] text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Disc3 className="w-8 h-8 text-[#2c49c5]/40 animate-spin" />
                  <p className="font-black text-slate-400 uppercase tracking-widest text-xs">GURU SEDANG MEMBERI NILAI...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 group/leg">
      <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover/leg:scale-110 transition-transform shadow-sm">
        {icon}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${color}`}>{label}</span>
    </div>
  );
}

function Dice({
  size,
  value,
  isRolling,
  onClick,
  isMyTurn,
}: {
  size: number;
  value: number;
  isRolling: boolean;
  onClick?: () => void;
  isMyTurn?: boolean;
}) {
  const faceRotations: Record<number, { rotateX: number; rotateY: number }> = {
    1: { rotateX: 0, rotateY: 0 },
    2: { rotateX: 0, rotateY: -90 },
    3: { rotateX: -90, rotateY: 0 },
    4: { rotateX: 90, rotateY: 0 },
    5: { rotateX: 0, rotateY: 90 },
    6: { rotateX: 0, rotateY: 180 },
  };

  const [shuffleValue, setShuffleValue] = useState(value);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRolling) {
      interval = setInterval(
        () => setShuffleValue(Math.floor(Math.random() * 6) + 1),
        100,
      );
    }
    return () => clearInterval(interval);
  }, [isRolling]);

  const displayValue = isRolling ? shuffleValue : (value || 1);

  return (
    <div
      className={`relative flex items-center justify-center ${isMyTurn ? "cursor-pointer pointer-events-auto group" : "pointer-events-none"}`}
      style={{ perspective: "1200px", width: size, height: size }}
      onClick={onClick}
    >
      {isMyTurn && (
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.4, 0.1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute inset-0 bg-blue-400/20 blur-[80px] rounded-full"
        />
      )}

      <motion.div
        animate={
          isRolling
            ? { rotateX: [0, 720, 1440, 2160], rotateY: [0, 720, 1440, 2160], rotateZ: [0, 180, 360], y: [-80, 0, -80, 0], scale: [1, 1.2, 0.8, 1] }
            : { ...faceRotations[displayValue] || faceRotations[1], rotateZ: 0, y: 0, scale: 1 }
        }
        whileHover={isMyTurn ? { scale: 1.15 } : {}}
        whileTap={isMyTurn ? { scale: 0.9, rotateX: 10, rotateY: 10 } : {}}
        transition={
          isRolling
            ? { duration: 1.2, repeat: Infinity, ease: "linear" }
            : { type: "spring", stiffness: 200, damping: 20 }
        }
        className="relative w-full h-full z-10"
        style={{ transformStyle: "preserve-3d" }}
      >
        <DieFace val={1} transform={`translateZ(${size / 2}px)`} />
        <DieFace val={6} transform={`rotateY(180deg) translateZ(${size / 2}px)`} />
        <DieFace val={2} transform={`rotateY(90deg) translateZ(${size / 2}px)`} />
        <DieFace val={5} transform={`rotateY(-90deg) translateZ(${size / 2}px)`} />
        <DieFace val={3} transform={`rotateX(90deg) translateZ(${size / 2}px)`} />
        <DieFace val={4} transform={`rotateX(-90deg) translateZ(${size / 2}px)`} />
      </motion.div>

      <motion.div
        animate={isRolling ? { scale: [1, 0.4, 1], opacity: [0.3, 0.05, 0.3] } : { scale: 1, opacity: 0.1 }}
        className="absolute -bottom-16 w-3/4 h-6 bg-slate-900 blur-2xl rounded-full"
      />

      {isMyTurn && (
        <div className="absolute -bottom-20 whitespace-nowrap text-[10px] font-black text-[#2c49c5] tracking-[0.4em] uppercase opacity-0 group-hover:opacity-100 transition-all bg-blue-50 px-5 py-2 rounded-xl border border-blue-100 shadow-xl shadow-blue-500/5 backdrop-blur-md translate-y-4 group-hover:translate-y-0">
          GULIRKAN DADU!
        </div>
      )}
    </div>
  );
}

function DieFace({ val, transform }: { val: number; transform: string }) {
  const dotPositions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const dots = dotPositions[val] || [];

  return (
    <div
      className="absolute inset-0 bg-white border-4 border-slate-100 rounded-[2rem] flex flex-wrap items-center justify-center p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]"
      style={{ transform, backfaceVisibility: "hidden" }}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full place-items-center">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full shadow-inner ${dots.includes(i) ? "bg-slate-900 scale-100" : "bg-transparent scale-0"}`}
            style={{ width: "24%", height: "24%" }}
          />
        ))}
      </div>
    </div>
  );
}
