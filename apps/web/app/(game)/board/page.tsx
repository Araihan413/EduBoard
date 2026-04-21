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

// Card Animation State Machine
type CardPhase = "idle" | "drawing" | "revealed" | "returning";

// Wrapper for Suspense
export default function BoardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
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
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#3b82f6", "#10b981", "#f59e0b"] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#3b82f6", "#10b981", "#f59e0b"] });
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 text-center">
        <Disc3 className="w-16 h-16 text-[#2c49c5] animate-spin mb-6" />
        <h2 className="text-3xl font-black tracking-tight">Mempersiapkan Papan...</h2>
        <p className="text-slate-500 mt-3 font-medium max-w-sm">
          Menunggu Guru untuk mengklik &quot;Mulai Permainan&quot; di Dashboard.
        </p>
        {role === "guru" && (
          <Link href="/dashboard" className="mt-8 text-[#2c49c5] font-black hover:underline uppercase tracking-widest text-sm">
            &larr; Ke Dashboard Guru
          </Link>
        )}
      </div>
    );
  }

  if (!roomCode && gameStatus === "IDLE") {
    return (
       <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 text-center">
         <Disc3 className="w-16 h-16 text-slate-300 animate-spin mb-6" />
         <h2 className="text-xl font-bold text-slate-400">Menghubungkan Kembali...</h2>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans select-none overflow-hidden relative">
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
        isCardActive ? "bg-orange-600/15" :
        activeGroupIndex === 0 ? "bg-blue-600/15" :
        activeGroupIndex === 1 ? "bg-red-600/15" : "bg-purple-600/15"
      }`} />

      <header className="h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm text-slate-900 relative">
        <div className="flex bg-slate-50 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide border border-slate-200">
          <span className="text-slate-400 mr-2">ROOM</span>
          <span className="text-[#2c49c5]">{roomCode}</span>
        </div>

        {/* Monitoring Mode Badge (Centered) */}
        {role === "guru" && (
          <div className="absolute left-1/2 top-20 -translate-x-1/2 flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full shadow-sm animate-pulse z-10">
            <div className="w-1.5 h-1.5 bg-[#2c49c5] rounded-full" />
            <span className="text-[9px] font-black text-[#2c49c5] uppercase tracking-[0.2em] whitespace-nowrap">
              📡 Mode Memantau
            </span>
          </div>
        )}

        {activeGroup && (
          <div className="flex items-center gap-6">
            <AnimatePresence>
              {isTimerRunning && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col items-center border-r border-slate-200 pr-6 mr-6"
                >
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 italic">Selesaikan Soal!</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-black font-mono transition-colors ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                      {timer}<span className="text-xs ml-0.5">s</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col items-center">
              <span className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Giliran</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                <span className="font-extrabold text-base tracking-wide text-slate-900">{activeGroup.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-center bg-slate-900 px-6 py-2 rounded-xl border-2 border-slate-800 relative overflow-hidden shadow-xl min-w-[130px]">
              <Timer className={`w-5 h-5 mr-3 ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
              <span className={`text-2xl font-mono font-black ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500" : "text-white"}`}>
                {formatTime(globalTimer)}
              </span>
              {isGlobalTimerRunning && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#2c49c5] to-[#ffda59] transition-all duration-1000 ease-linear"
                  style={{ width: `${(globalTimer / (roomConfig?.gameDurationSec || 600)) * 100}%` }}
                />
              )}
            </div>
          </div>
        )}

        {role === "guru" ? (
          <Link href="/dashboard" className="flex items-center px-4 py-2 hover:bg-yellow-500/10 rounded-full text-yellow-500 transition-colors border border-transparent hover:border-yellow-500/20 font-bold text-sm">
            &larr; DASHBOARD
          </Link>
        ) : (
          <Link href="/lobby" className="hover:bg-red-500/10 p-3 rounded-full text-zinc-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20">
            <LogOut className="w-5 h-5" />
          </Link>
        )}
      </header>

      <div className="flex-1 flex flex-col xl:flex-row w-full relative z-10 p-4 lg:p-6 pr-6 lg:pr-10 gap-4 lg:gap-6 overflow-x-hidden overflow-y-auto xl:overflow-hidden">
        <div className="w-full xl:w-64 flex flex-col gap-4 relative h-max">
           <div className="relative group/legend">
             <button className="flex items-center gap-4 bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm hover:border-[#2c49c5] transition-all group">
               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-[#2c49c5] transition-all">
                 <Info className="w-6 h-6" />
               </div>
               <span className="text-sm font-black text-slate-900 tracking-tight">Keterangan</span>
             </button>
             <div className="absolute top-full left-0 mt-3 w-72 bg-white/95 backdrop-blur-xl border border-slate-100 p-8 rounded-2xl shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/legend:opacity-100 group-hover/legend:scale-100 group-hover/legend:pointer-events-auto transition-all duration-300 origin-top-left z-50">
               <div className="absolute top-0 left-8 w-4 h-4 bg-white border-t border-l border-slate-100 -translate-y-2 rotate-45" />
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Jenis Kartu</h3>
               <div className="space-y-4">
                 <LegendItem icon={<BookOpen className="w-5 h-5 text-blue-500" />} color="text-slate-700" label="Kartu Dasar" />
                 <LegendItem icon={<Target className="w-5 h-5 text-red-500" />} color="text-slate-700" label="Kartu Aksi" />
                 <LegendItem icon={<Flame className="w-5 h-5 text-orange-500" />} color="text-slate-700" label="Kartu Tantangan" />
                 <LegendItem icon={<Moon className="w-5 h-5 text-purple-500" />} color="text-slate-700" label="Berhenti 1 Putaran" />
               </div>
             </div>
           </div>

           <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-200/40 flex-1 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Award className="w-4 h-4" /> Klasemen Tim
             </h3>
             <div className="space-y-4">
               {[...groups]
                 .map((g, i) => ({ ...g, originalIndex: i }))
                 .sort((a, b) => b.score - a.score)
                 .map((g, rank) => (
                   <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-slate-50 transition-all">
                     <div className="flex items-center gap-4">
                       <span className={`text-xs font-black w-6 h-6 rounded-lg flex items-center justify-center ${rank === 0 ? "bg-yellow-100 text-yellow-700" : rank === 1 ? "bg-slate-100 text-slate-500" : rank === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"}`}>
                         {rank + 1}
                       </span>
                       <div className={`w-3 h-3 rounded-full shadow-sm ${g.originalIndex === 0 ? "bg-[#2c49c5]" : g.originalIndex === 1 ? "bg-red-500" : g.originalIndex === 2 ? "bg-purple-500" : "bg-emerald-500"}`} />
                       <span className={`text-sm font-black ${activeGroupIndex === g.originalIndex ? "text-[#2c49c5]" : "text-slate-500"}`}>
                         {g.name}
                       </span>
                     </div>
                     <span className="text-sm font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{g.score}</span>
                   </div>
                 ))}
             </div>
           </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center">
          <BoardCanvas groups={groups} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <Dice
              size={120}
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
                 exit={{ opacity: 0, y: 20 }}
                 className="absolute top-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl flex items-center shadow-2xl pointer-events-none z-30"
               >
                 {role === "siswa" && activeGroup.name === myGroupName ? (
                   <div className="flex items-center gap-4">
                     <div className="w-3 h-3 rounded-full bg-[#2c49c5] animate-[pulse_1s_infinite]" />
                     <span className="text-[#2c49c5] font-black tracking-[0.2em] text-sm uppercase">GILIRAN KAMU: LEMPAR DADU!</span>
                   </div>
                 ) : (
                   <div className="flex items-center gap-4">
                     <span className="text-sm font-black text-slate-400 tracking-widest uppercase">
                       {role === "siswa" ? "TIM LAIN BEROPERASI" : "SUPERVISOR MODE"}
                     </span>
                     <span className="text-slate-100 font-thin italic">/</span>
                     <p className="text-slate-900 font-black text-base">{activeGroup.name}...</p>
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
                 className={`absolute z-40 flex items-center pointer-events-none ${
                   role === "siswa" && activeGroup.name === myGroupName
                     ? "inset-0 flex-col justify-center p-12 bg-white/95 text-center"
                     : "top-32 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl px-10 py-5 rounded-2xl border border-orange-200 gap-5 shadow-2xl"
                 }`}
               >
                 <Disc3 className={`text-orange-500 animate-spin ${role === "siswa" && activeGroup.name === myGroupName ? "w-24 h-24 mb-10" : "w-7 h-7"}`} />
                 {role === "siswa" && activeGroup.name === myGroupName ? (
                   <>
                     <h2 className="text-5xl font-black text-slate-900 tracking-tight">Menunggu Guru Menilai...</h2>
                     <p className="text-slate-500 mt-6 text-xl font-medium">Jawaban hebat kamu sedang dibaca oleh Guru.</p>
                   </>
                 ) : (
                   <p className="text-slate-900 font-black text-lg tracking-tight">Guru sedang menilai {activeGroup.name}...</p>
                 )}
               </motion.div>
             )}

            {gameStatus === "FINISHED" && (
              <motion.div
                key="victory"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 inset-0 flex flex-col items-center justify-center p-12 bg-white/98 backdrop-blur-3xl z-50 text-center"
              >
                <div className="bg-yellow-50 p-12 rounded-2xl mb-10 border border-yellow-100 shadow-2xl shadow-yellow-500/10 rotate-3">
                  <Award className="w-32 h-32 text-[#ffda59] drop-shadow-[0_0_20px_rgba(255,218,89,0.4)]" />
                </div>
                <h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase mb-6">Misi Selesai!</h1>
                {winner && (
                  <div className="space-y-4 mb-12">
                     <p className="text-2xl text-slate-500 font-bold max-w-2xl">
                        Pemenang utama dalam misi kali ini adalah:
                     </p>
                     <div className="text-5xl text-[#2c49c5] font-black bg-blue-50 px-10 py-4 rounded-2xl border-2 border-blue-100 inline-block shadow-lg">
                        {winner.name}
                     </div>
                     <p className="text-xl font-black text-slate-400 mt-4 tracking-widest uppercase">Skor Akhir: {winner.score} POIN</p>
                  </div>
                )}
                <div className="flex gap-6">
                   {role === "guru" ? (
                     <Link href="/dashboard" className="px-12 py-5 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 text-lg">
                        KEMBALI KE PANEL GURU
                     </Link>
                   ) : (
                     <Link href="/lobby" className="px-12 py-5 rounded-xl bg-white border-2 border-slate-100 text-slate-900 font-black hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/50 text-lg">
                        KEMBALI KE LOBBY
                     </Link>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full xl:w-80 flex flex-col gap-6 relative pr-2">

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-[#2c49c5]/10" />
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 text-center">
               Tumpukan Kartu Misi
             </h3>
            <div className="flex flex-col items-center gap-10">
              <PhysicalDeck
                type="DASAR"
                label="Dasar"
                isDrawn={isCardActive && displayCard?.type === "DASAR"}
              />
              <PhysicalDeck
                type="AKSI"
                label="Aksi"
                isDrawn={isCardActive && displayCard?.type === "AKSI"}
              />
              <PhysicalDeck
                type="TANTANGAN"
                label="Tantangan"
                isDrawn={isCardActive && displayCard?.type === "TANTANGAN"}
              />
            </div>
          </div>

          {role === "guru" && !currentCard && !isCardActive && (
             <button
               onClick={nextTurn}
               className="w-full py-5 bg-slate-900 text-white font-black text-xs tracking-widest uppercase rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
             >
               Lanjut Giliran Berikutnya <LogOut className="w-4 h-4 rotate-180" />
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
    type === "DASAR" ? { bg: "bg-[#2c49c5]", text: "text-[#2c49c5]", border: "border-[#2c49c5]/30", glow: "rgba(44,73,197,0.1)" } :
    type === "AKSI" ? { bg: "bg-red-500", text: "text-red-500", border: "border-red-500/30", glow: "rgba(239,68,68,0.1)" } :
    { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/30", glow: "rgba(249,115,22,0.1)" };

  return (
    <div className="relative" style={{ width: 112, height: 160 }}>
      {/* Shadow layers */}
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-zinc-800 rounded-xl" />
      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-zinc-700 rounded-xl" />

      {/* Static bottom card */}
      <div className="absolute inset-0 rounded-[14px] overflow-hidden">
        <CardBackFace type={type} />
      </div>

      {/* Top card animate */}
      <motion.div
        className="absolute inset-0 rounded-[14px] overflow-hidden"
        animate={isDrawn ? { opacity: 0, y: -8, scale: 0.97 } : { opacity: 1, y: 0, scale: 1 }}
        transition={isDrawn
          ? { duration: 0.25, ease: "easeOut" }
          : { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
        }
        style={{ boxShadow: `0 8px 24px ${accent.glow}` }}
      >
        <CardBackFace type={type} />
      </motion.div>

      <AnimatePresence>
        {isDrawn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute -inset-1 rounded-[18px] border-2 ${accent.border} pointer-events-none`}
          />
        )}
      </AnimatePresence>

      <div className="absolute -top-4 left-0 right-0 flex items-center justify-center gap-2">
        {type === "DASAR" && <BookOpen className={`w-3 h-3 ${accent.text}`} />}
        {type === "AKSI" && <Target className={`w-3 h-3 ${accent.text}`} />}
        {type === "TANTANGAN" && <Flame className={`w-3 h-3 ${accent.text}`} />}
        <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${accent.text}`}>{label}</span>
      </div>
    </div>
  );
}

function CardBackFace({ type, className }: { type: string; className?: string }) {
  const accentColor =
    type === "DASAR" ? "text-blue-400" :
    type === "AKSI" ? "text-red-400" : "text-orange-400";

  return (
    <div className={`absolute inset-0 bg-[#1e293b] border-4 border-slate-700/50 flex flex-col items-center justify-center overflow-hidden ${className || "rounded-xl"}`}>
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}
      />
      <div className="absolute inset-[10px] border border-white/5 rounded-lg" />
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-sm">
        {type === "DASAR" && <BookOpen className={`w-7 h-7 ${accentColor}`} />}
        {type === "AKSI" && <Target className={`w-7 h-7 ${accentColor}`} />}
        {type === "TANTANGAN" && <Flame className={`w-7 h-7 ${accentColor}`} />}
      </div>
      <span className="text-[8px] font-black tracking-[0.5em] text-white uppercase mt-4">EDUBOARD</span>
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
    hidden: { x: 280, y: 60, scale: 0.28, opacity: 0 },
    drawing: { x: 0, y: 0, scale: 1, opacity: 1 },
    revealed: { x: 0, y: 0, scale: 1, opacity: 1 },
    returning: { x: 280, y: 60, scale: 0.28, opacity: 0 },
  };

  const getPositionTarget = () => {
    if (phase === "returning") return "returning";
    if (phase === "drawing" || phase === "revealed") return "drawing";
    return "hidden";
  };

  const getPositionTransition = () => {
    if (phase === "drawing") return { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
    if (phase === "returning") return { duration: 0.5, ease: [0.4, 0, 0.6, 1] as [number, number, number, number], delay: 0.32 };
    return { duration: 0.3 };
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ pointerEvents: phase === "drawing" ? "none" : "auto" }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "returning" ? 0 : 0.4 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            className="relative z-10"
            style={{ perspective: 1200, width: 360, maxWidth: "92vw" }}
            variants={positionVariants}
            initial="hidden"
            animate={getPositionTarget()}
            transition={getPositionTransition()}
          >
            <motion.div
              className="w-full relative"
              style={{ height: 520, transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              <div
                className="absolute inset-0"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardBackFace type={cardType} className="rounded-[20px]" />
                <div 
                  className="absolute inset-0 pointer-events-none rounded-[20px]" 
                  style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)" }} 
                />
              </div>

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
    cardType === "DASAR" ? "bg-blue-600" :
    cardType === "AKSI" ? "bg-red-600" : "bg-orange-600";

  const accentText =
    isUnderReview ? "text-orange-600" :
    cardType === "DASAR" ? "text-blue-600" :
    cardType === "AKSI" ? "text-red-600" : "text-orange-600";

  return (
    <div
      className="absolute inset-0 bg-[#fafafa] rounded-[20px] flex flex-col p-7 overflow-hidden"
      style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 4px rgba(0,0,0,0.08)" }}
    >
      <div
        className={`absolute top-0 right-0 w-28 h-28 ${accentCorner}`}
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
      />

      {isTimerRunning && !isUnderReview && (
        <div className="absolute top-4 right-4 z-20 flex flex-col items-center">
           <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-xl ${timer <= 5 ? 'bg-red-500 animate-pulse' : 'bg-zinc-900'}`}>
              <span className="text-xl font-black text-white font-mono">{timer}</span>
           </div>
           <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${timer <= 5 ? 'text-red-500' : 'text-zinc-400'}`}>Detik</span>
        </div>
      )}

      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        <div className="mb-5 pb-4 border-b-2 border-zinc-900/10">
          <p className={`text-[10px] font-black uppercase tracking-[0.35em] mb-1 ${accentText}`}>
            {isUnderReview ? "PENILAIAN GURU" : `KARTU ${cardType}`}
          </p>
          {!isUnderReview && displayCard && (
            <p className="text-3xl font-black text-zinc-900 leading-none">{displayCard.points} <span className="text-sm font-bold text-zinc-400">POIN</span></p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {isUnderReview ? (
            <div className="space-y-5">
              {pendingReviews
                .filter((r) => r.groupId === activeGroup?.id)
                .map((review) => (
                  <div key={review.id} className="space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">PERTANYAAN</p>
                      <p className="text-base font-bold text-zinc-800 leading-snug">&ldquo;{review.questionText}&rdquo;</p>
                    </div>
                    <div className="p-5 bg-zinc-100 rounded-xl border-2 border-zinc-200">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                        <ScrollText className="w-3 h-3" /> JAWABAN {review.groupName}
                      </p>
                      <p className="text-base font-semibold text-zinc-800 italic leading-relaxed">{review.answerText}</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3">ISI KARTU</p>
              <p className="text-lg font-bold text-zinc-900 leading-snug mb-6">
                &ldquo;{displayCard?.text}&rdquo;
              </p>

              {role === "siswa" && activeGroup?.name === myGroupName && (
                <div className="mt-4 pt-4 border-t-2 border-zinc-100">
                  {currentCard?.type === "DASAR" && currentCard.options ? (
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentCard.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => submitAnswerObjektif(activeGroup.id, opt)}
                          className="w-full text-left px-5 py-3.5 rounded-xl border-2 border-zinc-900 bg-white text-base font-black text-zinc-900 hover:bg-zinc-50 hover:-translate-y-0.5 shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] active:translate-y-0 active:shadow-none transition-all"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : currentCard?.type === "TANTANGAN" ? (
                    <div className="space-y-3">
                      <textarea
                        autoFocus
                        className="w-full min-h-[100px] bg-white border-2 border-zinc-900 rounded-xl px-5 py-4 text-zinc-900 text-base font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/15 resize-none shadow-inner"
                        placeholder="Ketik jawabanmu..."
                        value={tantanganText}
                        onChange={(e) => setTantanganText(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          submitAnswerSubjektif(activeGroup.id, tantanganText);
                          setTantanganText("");
                        }}
                        disabled={!tantanganText.trim()}
                        className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-black tracking-[0.2em] uppercase hover:bg-zinc-800 disabled:opacity-20 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]"
                      >
                        KIRIM JAWABAN
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => submitAnswerObjektif(activeGroup.id, "SELESAI")}
                      className="w-full py-4 rounded-xl bg-zinc-900 text-white text-base font-black tracking-widest uppercase hover:bg-zinc-800 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] active:scale-95"
                    >
                      SAYA MENGERTI
                    </button>
                  )}
                </div>
              )}

              {(role === "guru" || activeGroup?.name !== myGroupName) && (
                <div className="mt-4 bg-zinc-100 border-2 border-zinc-200 p-6 rounded-xl text-center">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">STATUS</p>
                  <p className="text-base font-black text-zinc-800">MENUNGGU TIM {activeGroup?.name || "..."}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {isUnderReview && (
          <div className="mt-4 pt-4 border-t-2 border-zinc-200">
            {role === "guru" ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => gradeSubjektif(pendingReviews.find((r) => r.groupId === activeGroup?.id)!.id, 0)}
                  className="flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 border-zinc-800 bg-white hover:bg-red-50 transition-all shadow-[3px_3px_0_0_rgba(0,0,0,0.85)] active:shadow-none active:translate-y-0.5"
                >
                  <span className="text-[8px] font-black text-zinc-400 uppercase">Salah</span>
                  <span className="font-black text-zinc-900 text-[11px] tracking-wide">TIDAK TEPAT</span>
                </button>
                <button
                  onClick={() => {
                    const r = pendingReviews.find((r) => r.groupId === activeGroup?.id)!;
                    gradeSubjektif(r.id, Math.floor(r.maxPoints / 2));
                  }}
                  className="flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 border-zinc-800 bg-white hover:bg-orange-50 transition-all shadow-[3px_3px_0_0_rgba(0,0,0,0.85)] active:shadow-none active:translate-y-0.5"
                >
                  <span className="text-[8px] font-black text-zinc-400 uppercase">Setengah</span>
                  <span className="font-black text-zinc-900 text-[11px] tracking-wide">SEBAGIAN</span>
                </button>
                <button
                  onClick={() => {
                    const r = pendingReviews.find((r) => r.groupId === activeGroup?.id)!;
                    gradeSubjektif(r.id, r.maxPoints);
                  }}
                  className="flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-0.5"
                >
                  <span className="text-[8px] font-black text-white/50 uppercase">Benar</span>
                  <span className="font-black text-[11px] tracking-wide">TEPAT SEKALI</span>
                </button>
              </div>
            ) : (
              <div className="bg-zinc-100 border-2 border-dashed border-zinc-300 p-5 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2">
                  <Disc3 className="w-5 h-5 text-zinc-700 animate-spin" />
                  <p className="font-black text-zinc-800 uppercase tracking-widest text-sm">SEDANG DINILAI GURU</p>
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
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{label}</span>
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
      style={{ perspective: "1000px", width: size, height: size }}
      onClick={onClick}
    >
      <motion.div
        animate={
          isRolling
            ? { rotateX: [0, 360, 720], rotateY: [0, 360, 720], rotateZ: [0, 90, 180], y: [-50, 0, -50, 0], scale: [1, 1.1, 0.9, 1] }
            : { ...faceRotations[displayValue] || faceRotations[1], rotateZ: 0, y: 0, scale: 1 }
        }
        whileHover={isMyTurn ? { scale: 1.1 } : {}}
        whileTap={isMyTurn ? { scale: 0.9 } : {}}
        transition={
          isRolling
            ? { duration: 1, repeat: Infinity, ease: "linear" }
            : { type: "spring", stiffness: 150, damping: 15 }
        }
        className="relative w-full h-full z-10"
        style={{ transformStyle: "preserve-3d" }}
      >
        <DieFace val={1} size={size} transform={`translateZ(${size / 2}px)`} />
        <DieFace val={6} size={size} transform={`rotateY(180deg) translateZ(${size / 2}px)`} />
        <DieFace val={2} size={size} transform={`rotateY(90deg) translateZ(${size / 2}px)`} />
        <DieFace val={5} size={size} transform={`rotateY(-90deg) translateZ(${size / 2}px)`} />
        <DieFace val={3} size={size} transform={`rotateX(90deg) translateZ(${size / 2}px)`} />
        <DieFace val={4} size={size} transform={`rotateX(-90deg) translateZ(${size / 2}px)`} />
      </motion.div>

      <motion.div
        animate={isRolling ? { scale: [1, 0.5, 1], opacity: [0.2, 0.05, 0.2] } : { scale: 1, opacity: 0.2 }}
        className="absolute -bottom-10 w-1/2 h-4 bg-black/40 blur-xl rounded-full"
      />

      {isMyTurn && (
        <div className="absolute -bottom-14 whitespace-nowrap text-xs font-black text-blue-400 tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
          Klik untuk Putar!
        </div>
      )}
    </div>
  );
}

function DieFace({ val, size, transform }: { val: number; size: number; transform: string }) {
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
      className="absolute inset-0 bg-white border-4 border-zinc-200 rounded-3xl flex flex-wrap items-center justify-center p-3 shadow-inner"
      style={{ transform, backfaceVisibility: "hidden" }}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full place-items-center">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full ${dots.includes(i) ? "bg-zinc-900 scale-100" : "bg-transparent scale-0"}`}
            style={{ width: "22%", height: "22%" }}
          />
        ))}
      </div>
    </div>
  );
}

function ResultNotification({ result, onClose }: { result: AnswerResult; onClose: () => void }) {
  const { clearLastResult } = useGameStore();
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
        {/* Close Button */}
        <button 
          onClick={() => onClose ? onClose() : clearLastResult()}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Glow Background */}
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

