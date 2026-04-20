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
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const BoardCanvas = dynamic(
  () => import("../../../components/game/BoardCanvas"),
  { ssr: false },
);

// ─── Card Animation State Machine ─────────────────────────────────────────────
//
//  idle       → deck looks normal, no card active
//  drawing    → top card lifts from deck → flies to center (back face shown)
//  revealed   → card at center, flips to front (question visible, NO blur)
//  returning  → card flips back to back → slides back to deck bottom
//
type CardPhase = "idle" | "drawing" | "revealed" | "returning";

// ─── Wrapper for Suspense ──────────────────────────────────────────────────────
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

// ─── Main Board Page ───────────────────────────────────────────────────────────
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
    createRoom,
  } = useGameStore();

  const [tantanganText, setTantanganText] = useState("");

  // ── State Machine ──────────────────────────────────────────────────────────
  const [stickyCardData, setStickyCardData] = useState<QuestionCard | null>(null);
  const [cardPhase, setCardPhase] = useState<CardPhase>("idle");
  const cardPhaseRef = useRef<CardPhase>("idle");

  // Adjusting state during render (React-recommended pattern for props-to-state sync)
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
      // Card answered → returning to deck
      updatePhase("returning");
      const t = setTimeout(() => {
        setStickyCardData(null);
        updatePhase("idle");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [currentCard]);

  // ── Confetti ───────────────────────────────────────────────────────────────
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

  // ── Auto Rejoin ────────────────────────────────────────────────────────────
  useEffect(() => {
    const queryRoom = searchParams?.get("roomCode");
    const queryRole = searchParams?.get("role");

    // If store is empty but URL has room code, attempt to rejoin
    if (queryRoom && !roomCode) {
      if (queryRole === "guru") {
        socket?.emit("room:join", { roomCode: queryRoom, role: "guru" });
      } else {
        const savedName = localStorage.getItem(`eduboard_name_${queryRoom}`);
        if (savedName) {
          joinRoom(queryRoom, savedName);
        } else {
          // Fallback: Join room as anonymous to at least see state/results
          socket?.emit("room:join", { roomCode: queryRoom, role: "siswa" });
        }
      }
    }
  }, [searchParams, roomCode, joinRoom]);

  const activeGroup = groups[activeGroupIndex];
  const isUnderReview = pendingReviews.some((r) => r.groupId === activeGroup?.id);

  // displayCard keeps the card data alive during the "returning" phase
  const displayCard = currentCard ?? stickyCardData;

  // Format timer as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const isCardActive = cardPhase !== "idle";

  // Show loading only if not finished and not joined yet
  if (!activeGroup && gameStatus !== "FINISHED" && gameStatus !== "IDLE") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <Disc3 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold">Mempersiapkan Papan...</h2>
        <p className="text-zinc-500 mt-2">
          Menunggu Guru untuk mengklik &quot;Mulai Permainan&quot; di Dashboard.
        </p>
        
        {role === "guru" && (
          <Link href="/dashboard" className="mt-8 text-blue-500 hover:underline">
            Ke Dashboard Guru
          </Link>
        )}
      </div>
    );
  }

  // If IDLE (just refreshed and waiting for join to trigger/complete)
  if (!roomCode && gameStatus === "IDLE") {
    return (
       <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center">
         <Disc3 className="w-16 h-16 text-zinc-800 animate-spin mb-6" />
         <h2 className="text-xl font-bold text-zinc-400">Menghubungkan Kembali...</h2>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans select-none overflow-hidden relative"
      style={{ backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.04) 0%, transparent 60%)" }}
    >
      {/* Ambient glow */}
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
        isCardActive ? "bg-orange-600/15" :
        activeGroupIndex === 0 ? "bg-blue-600/15" :
        activeGroupIndex === 1 ? "bg-red-600/15" : "bg-purple-600/15"
      }`} />

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <header className="h-16 flex items-center justify-between px-6 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 shadow-xl z-20 text-white relative">
        <div className="flex bg-zinc-950 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide border border-zinc-800">
          <span className="text-zinc-500 mr-2">ROOM</span>
          <span className="text-emerald-400">{roomCode}</span>
        </div>

        {activeGroup && (
          <div className="flex items-center gap-6">
            {/* Answer Timer (Visible only when a card is active) */}
            <AnimatePresence>
              {isTimerRunning && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col items-center border-r border-zinc-800 pr-6 mr-6"
                >
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 italic">Selesaikan Soal!</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-black font-mono transition-colors ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`}>
                      {timer}<span className="text-xs ml-0.5">s</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col items-center">
              <span className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Giliran</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                <span className="font-extrabold text-base tracking-wide text-zinc-100">{activeGroup.name}</span>
              </div>
            </div>

            {/* Global Session Timer */}
            <div className="flex items-center justify-center bg-zinc-950 px-6 py-2 rounded-2xl border border-zinc-800 relative overflow-hidden shadow-inner min-w-[140px]">
              <Timer className={`w-5 h-5 mr-3 ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500 animate-pulse" : "text-zinc-500"}`} />
              <span className={`text-3xl font-mono font-black ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500" : "text-white"}`}>
                {formatTime(globalTimer)}
              </span>
              <span className="text-xs font-bold text-zinc-600 ml-1 mt-2">rem</span>
              {isGlobalTimerRunning && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000 ease-linear"
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

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col xl:flex-row w-full relative z-10 p-4 lg:p-6 gap-4 lg:gap-6 overflow-x-hidden overflow-y-auto xl:overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-full xl:w-64 flex flex-col gap-4 relative h-max">
          {/* Legend Popover */}
          <div className="relative group/legend">
            <button className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 px-4 py-2 rounded-3xl shadow-lg hover:bg-zinc-800 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover/legend:text-blue-400 transition-colors">
                <Info className="w-6 h-6" />
              </div>
              <span className="text-sm font-black text-white tracking-tight">Keterangan</span>
            </button>
            <div className="absolute top-full left-0 mt-3 w-64 bg-zinc-900/98 backdrop-blur-2xl border border-zinc-800 p-6 rounded-[2rem] shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/legend:opacity-100 group-hover/legend:scale-100 group-hover/legend:pointer-events-auto transition-all duration-300 origin-top-left z-50">
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6">Informasi Kartu</h3>
              <div className="space-y-2">
                <LegendItem icon={<BookOpen className="w-5 h-5 text-blue-400" />} color="text-blue-400" label="Kartu Dasar" />
                <LegendItem icon={<Target className="w-5 h-5 text-red-400" />} color="text-red-400" label="Kartu Aksi" />
                <LegendItem icon={<Flame className="w-5 h-5 text-orange-400" />} color="text-orange-400" label="Kartu Tantangan" />
                <LegendItem icon={<Moon className="w-5 h-5 text-purple-400" />} color="text-purple-400" label="Skip 1 Putaran" />
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl flex-1 pb-12">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Leaderboard</h3>
            <div className="space-y-3">
              {[...groups]
                .map((g, i) => ({ ...g, originalIndex: i }))
                .sort((a, b) => b.score - a.score)
                .map((g, rank) => (
                  <div key={g.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black w-5 text-center ${rank === 0 ? "text-yellow-400" : rank === 1 ? "text-zinc-400" : rank === 2 ? "text-amber-600" : "text-zinc-600"}`}>
                        {rank + 1}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${g.originalIndex === 0 ? "bg-blue-500" : g.originalIndex === 1 ? "bg-red-500" : g.originalIndex === 2 ? "bg-purple-500" : "bg-emerald-500"}`} />
                      <span className={`text-sm font-bold ${activeGroupIndex === g.originalIndex ? "text-white underline underline-offset-4" : "text-zinc-500"}`}>
                        {g.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-white">{g.score}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Center Board */}
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
            {gameStatus === "PLAYING" && !currentCard && timer > 0 && !isUnderReview && !isCardActive && (
              <motion.div
                key="turn-indicator"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-zinc-900/90 backdrop-blur-lg border border-zinc-700 rounded-full flex items-center shadow-lg pointer-events-none z-30"
              >
                {role === "siswa" && activeGroup.name === myGroupName ? (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <span className="text-blue-400 font-black tracking-widest text-sm uppercase">GILIRAN KAMU: KLIK DADU!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-300 tracking-widest uppercase">
                      {role === "siswa" ? "TIM LAIN BERMAIN" : "MODE PENGAWAS"}
                    </span>
                    <span className="text-zinc-600">|</span>
                    <p className="text-emerald-400 font-bold text-sm animate-pulse">{activeGroup.name}...</p>
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
                    ? "inset-0 flex-col justify-center p-6 bg-zinc-950/80 text-center"
                    : "top-24 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-orange-500/30 gap-3"
                }`}
              >
                <Disc3 className={`text-orange-500 animate-spin ${role === "siswa" && activeGroup.name === myGroupName ? "w-20 h-20 mb-6" : "w-5 h-5"}`} />
                {role === "siswa" && activeGroup.name === myGroupName ? (
                  <>
                    <h2 className="text-3xl font-black text-white">Menunggu Penilaian Guru...</h2>
                    <p className="text-zinc-400 mt-4">Jawaban kamu sedang dibaca di layar Guru.</p>
                  </>
                ) : (
                  <p className="text-white font-bold text-sm">Menunggu Guru menilai {activeGroup.name}...</p>
                )}
              </motion.div>
            )}

            {gameStatus === "FINISHED" && (
              <motion.div
                key="victory"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-xl z-50 text-center"
              >
                <div className="bg-gradient-to-tr from-yellow-500/20 to-amber-500/20 p-8 rounded-full mb-8 border border-yellow-500/30">
                  <Award className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                </div>
                <h1 className="text-6xl font-black text-white tracking-widest uppercase mb-4">PERMAINAN SELESAI</h1>
                {winner && (
                  <p className="text-3xl text-zinc-300 font-bold max-w-2xl">
                    Pemenangnya adalah{" "}
                    <span className="text-emerald-400">{winner.name}</span> dengan Skor{" "}
                    <span className="text-emerald-400">{winner.score}</span>!
                  </p>
                )}
                
                {role === "guru" ? (
                  <Link href="/dashboard" className="mt-12 px-8 py-4 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">
                    KEMBALI KE DASHBOARD
                  </Link>
                ) : (
                  <Link href="/lobby" className="mt-12 px-8 py-4 rounded-full bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-zinc-700 transition-all">
                    KEMBALI KE LOBBY
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar — Card Decks */}
        <div className="w-full xl:w-80 flex flex-col gap-6 relative">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-8 text-center">
              Tumpukan Kartu
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
              className="w-full py-4 bg-zinc-800 text-white font-black text-xs tracking-widest uppercase rounded-2xl border border-zinc-700 hover:bg-zinc-700 transition-all"
            >
              Next Turn →
            </button>
          )}
        </div>
      </div>

      {/* ── Card Overlay (the animated drawn card) ──────────────────────────── */}
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
    </div>
  );
}

// ─── Physical Card Deck ────────────────────────────────────────────────────────
// A realistic-looking deck of card backs stacked on top of each other.
// When `isDrawn` is true, the top card visually disappears (it's now the overlay).
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
    type === "DASAR" ? { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/40", glow: "rgba(59,130,246,0.3)" } :
    type === "AKSI" ? { bg: "bg-red-500", text: "text-red-400", border: "border-red-500/40", glow: "rgba(239,68,68,0.3)" } :
    { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/40", glow: "rgba(249,115,22,0.3)" };

  return (
    <div className="relative" style={{ width: 112, height: 160 }}>
      {/* Shadow layers — simulate card thickness */}
      <div className="absolute inset-0 translate-x-2.25 translate-y-2.25 bg-zinc-800 rounded-[14px] border border-zinc-700/50" />
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-zinc-700 rounded-[14px] border border-zinc-600/50" />
      <div className="absolute inset-0 translate-x-0.75 translate-y-0.75 bg-zinc-600 rounded-[14px] border border-zinc-500/50" />

      {/* Base card — stays visible even when top card is drawn */}
      <div className="absolute inset-0 rounded-[14px] overflow-hidden">
        <CardBackFace type={type} />
      </div>

      {/* Top card — disappears when drawn, appears when returned */}
      <motion.div
        className="absolute inset-0 rounded-[14px] overflow-hidden"
        animate={isDrawn ? { opacity: 0, y: -8, scale: 0.97 } : { opacity: 1, y: 0, scale: 1 }}
        transition={isDrawn
          ? { duration: 0.25, ease: "easeOut" }
          : { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }  // spring back
        }
        style={{ boxShadow: `0 8px 24px ${accent.glow}` }}
      >
        <CardBackFace type={type} />
      </motion.div>

      {/* Glow ring when active */}
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

      {/* Label above */}
      <div className="absolute -top-4 left-0 right-0 flex items-center justify-center gap-2">
        {type === "DASAR" && <BookOpen className={`w-3 h-3 ${accent.text}`} />}
        {type === "AKSI" && <Target className={`w-3 h-3 ${accent.text}`} />}
        {type === "TANTANGAN" && <Flame className={`w-3 h-3 ${accent.text}`} />}
        <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${accent.text}`}>{label}</span>
      </div>
    </div>
  );
}

// ─── Card Back Face (shared design for deck and overlay) ──────────────────────
function CardBackFace({ type }: { type: string }) {
  const accent =
    type === "DASAR" ? "bg-blue-500" :
    type === "AKSI" ? "bg-red-500" : "bg-orange-500";

  return (
    <div className="absolute inset-0 bg-zinc-900 border-2 border-zinc-700 rounded-[14px] flex flex-col items-center justify-center overflow-hidden">
      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "14px 14px" }}
      />
      {/* Inner border detail */}
      <div className="absolute inset-[8px] border border-zinc-600/40 rounded-[8px]" />
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full ${accent}/15 flex items-center justify-center`}>
        {type === "DASAR" && <BookOpen className="w-5 h-5 text-zinc-400" />}
        {type === "AKSI" && <Target className="w-5 h-5 text-zinc-400" />}
        {type === "TANTANGAN" && <Flame className="w-5 h-5 text-zinc-400" />}
      </div>
      <span className="text-[7px] font-black tracking-[0.4em] text-zinc-600 uppercase mt-2">EDUBOARD</span>
    </div>
  );
}

// ─── Card Overlay ──────────────────────────────────────────────────────────────
// Handles the full animation: draw → flip to reveal → flip back → return
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
  // isFlipped: tracks 3D flip state
  // false = back face shown, true = front face (question) shown
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (phase === "revealed") {
      // Small delay so the card reaches center before flipping
      const t = setTimeout(() => setIsFlipped(true), 80);
      return () => clearTimeout(t);
    }
    // No setState needed here: `flipped` below is derived and automatically
    // returns false for any phase that is not "revealed".
  }, [phase]);

  const flipped = phase === "revealed" ? isFlipped : false;

  const cardType = displayCard?.type ?? "DASAR";
  const isVisible = phase !== "idle";

  // Position animation: starts at deck position (right side), moves to center
  // x: positive = right (toward deck), negative = left (toward center)
  const positionVariants = {
    hidden: { x: 280, y: 60, scale: 0.28, opacity: 0 },
    drawing: { x: 0, y: 0, scale: 1, opacity: 1 },
    revealed: { x: 0, y: 0, scale: 1, opacity: 1 },
    returning: { x: 280, y: 60, scale: 0.28, opacity: 0 },
  };

  const getPositionTarget = () => {
    if (phase === "returning") return "returning";
    if (phase === "drawing" || phase === "revealed") return "drawing"; // same center position
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
          // Allow clicks through the backdrop when drawing (no interaction needed)
          style={{ pointerEvents: phase === "drawing" ? "none" : "auto" }}
        >
          {/* ── Backdrop — NO blur, just a semi-transparent dim ── */}
          <motion.div
            className="absolute inset-0 bg-zinc-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "returning" ? 0 : 0.65 }}
            transition={{ duration: 0.3 }}
          />

          {/* ── Card container: handles position animation ── */}
          <motion.div
            className="relative z-10"
            style={{ perspective: 1200, width: 360, maxWidth: "92vw" }}
            variants={positionVariants}
            initial="hidden"
            animate={getPositionTarget()}
            transition={getPositionTransition()}
          >
            {/* ── Flip container: handles 3D rotation ── */}
            <motion.div
              className="w-full relative"
              style={{ height: 520, transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              {/* BACK FACE (card design — visible while drawing/returning) */}
              <div
                className="absolute inset-0"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <div
                  className="absolute inset-0 bg-zinc-900 border-4 border-zinc-700 rounded-[20px] flex flex-col items-center justify-center overflow-hidden"
                  style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
                >
                  <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "18px 18px" }} />
                  <div className="absolute inset-[18px] border border-zinc-600/30 rounded-[12px]" />
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    cardType === "DASAR" ? "bg-blue-500/15" :
                    cardType === "AKSI" ? "bg-red-500/15" : "bg-orange-500/15"
                  }`}>
                    {cardType === "DASAR" && <BookOpen className="w-10 h-10 text-zinc-300" />}
                    {cardType === "AKSI" && <Target className="w-10 h-10 text-zinc-300" />}
                    {cardType === "TANTANGAN" && <Flame className="w-10 h-10 text-zinc-300" />}
                  </div>
                  <span className="text-xs font-black tracking-[0.5em] text-zinc-500 uppercase mt-4">EDUBOARD</span>
                </div>
              </div>

              {/* FRONT FACE (question content — revealed after flip) */}
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

// ─── Card Front Face (Question Content) ───────────────────────────────────────
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
      {/* Corner accent triangle */}
      <div
        className={`absolute top-0 right-0 w-28 h-28 ${accentCorner}`}
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
      />

      {/* Floating Timer Badge */}
      {isTimerRunning && !isUnderReview && (
        <div className="absolute top-4 right-4 z-20 flex flex-col items-center">
           <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-xl ${timer <= 5 ? 'bg-red-500 animate-pulse' : 'bg-zinc-900'}`}>
              <span className="text-xl font-black text-white font-mono">{timer}</span>
           </div>
           <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${timer <= 5 ? 'text-red-500' : 'text-zinc-400'}`}>Detik</span>
        </div>
      )}

      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        {/* Header */}
        <div className="mb-5 pb-4 border-b-2 border-zinc-900/10">
          <p className={`text-[10px] font-black uppercase tracking-[0.35em] mb-1 ${accentText}`}>
            {isUnderReview ? "PENILAIAN GURU" : `KARTU ${cardType}`}
          </p>
          {!isUnderReview && displayCard && (
            <p className="text-3xl font-black text-zinc-900 leading-none">{displayCard.points} <span className="text-sm font-bold text-zinc-400">POIN</span></p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {isUnderReview ? (
            // ── Review mode (guru grading) ──
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
            // ── Question mode ──
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3">ISI KARTU</p>
              <p className="text-lg font-bold text-zinc-900 leading-snug mb-6">
                &ldquo;{displayCard?.text}&rdquo;
              </p>

              {/* Active student interaction */}
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

              {/* Observer / Guru */}
              {(role === "guru" || activeGroup?.name !== myGroupName) && (
                <div className="mt-4 bg-zinc-100 border-2 border-zinc-200 p-6 rounded-xl text-center">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">STATUS</p>
                  <p className="text-base font-black text-zinc-800">MENUNGGU TIM {activeGroup?.name || "..."}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — guru grading buttons */}
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

// ─── Sub-components ────────────────────────────────────────────────────────────

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

  const displayValue = isRolling ? shuffleValue : value;

  return (
    <div
      className={`relative flex items-center justify-center ${isMyTurn ? "cursor-pointer pointer-events-auto group" : "pointer-events-none"}`}
      style={{ perspective: "1000px", width: size, height: size }}
      onClick={onClick}
    >
      {isMyTurn && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"
        />
      )}

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
      className="absolute inset-0 bg-white dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-700 rounded-3xl flex flex-wrap items-center justify-center p-3 shadow-inner"
      style={{ transform, backfaceVisibility: "hidden" }}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full place-items-center">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full ${dots.includes(i) ? "bg-zinc-900 dark:bg-white scale-100" : "bg-transparent scale-0"}`}
            style={{ width: "22%", height: "22%" }}
          />
        ))}
      </div>
    </div>
  );
}
