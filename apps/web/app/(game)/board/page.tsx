"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Info,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Clock,
  LayoutDashboard,
  Trophy,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
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
  const router = useRouter();
  const role = searchParams?.get("role") || "siswa";
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const {
    groups,
    activeGroupIndex,
    timer,
    globalTimer,
    gameStatus,
    roomCode,
    isTimerRunning,
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
    leaveRoom,
    lastResult,
    clearLastResult,
    fetchQuestions,
  } = useGameStore();

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const [tantanganText, setTantanganText] = useState("");
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    if (isMounted && !roomCode && gameStatus === "IDLE") {
      router.push("/lobby");
    }
  }, [isMounted, roomCode, gameStatus, router]);

  // State Machine
  const [stickyCardData, setStickyCardData] = useState<QuestionCard | null>(null);
  const [cardPhase, setCardPhase] = useState<CardPhase>("idle");
  const cardPhaseRef = useRef<CardPhase>("idle");



  const updatePhase = (phase: CardPhase) => {
    cardPhaseRef.current = phase;
    setCardPhase(phase);
  };

  const activeGroup = groups[activeGroupIndex];
  const myGroup = groups.find(g => g.name === myGroupName);
  const isUnderReview = role === "guru"
    ? pendingReviews.length > 0
    : pendingReviews.some((r) => r.groupId === activeGroup?.id || r.groupId === myGroup?.id);

  // Card State Machine — single effect, ref-driven to prevent race conditions
  const syncTimerRef    = useRef<NodeJS.Timeout | null>(null);
  const drawTimerRef    = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const returnTimerRef  = useRef<NodeJS.Timeout | null>(null);

  const clearAllCardTimers = () => {
    if (syncTimerRef.current)   { clearTimeout(syncTimerRef.current);   syncTimerRef.current   = null; }
    if (drawTimerRef.current)   { clearTimeout(drawTimerRef.current);   drawTimerRef.current   = null; }
    if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
    if (returnTimerRef.current) { clearTimeout(returnTimerRef.current); returnTimerRef.current = null; }
  };

  useEffect(() => {
    // Sync sticky data (deferred to avoid synchronous setState warning)
    if (currentCard && currentCard !== stickyCardData) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => setStickyCardData(currentCard), 0);
    }

    if (currentCard && !isMoving) {
      // New card is ready — cancel any pending return and start drawing
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
      if (cardPhaseRef.current === "idle" || cardPhaseRef.current === "returning") {
        clearAllCardTimers();
        updatePhase("drawing");
        revealTimerRef.current = setTimeout(() => {
          revealTimerRef.current = null;
          updatePhase("revealed");
        }, 550);
      }
    } else if (!currentCard && !isUnderReview) {
      // Card gone — only close if currently open or drawing
      if (cardPhaseRef.current === "revealed" || cardPhaseRef.current === "drawing") {
        clearAllCardTimers();
        updatePhase("returning");
        returnTimerRef.current = setTimeout(() => {
          returnTimerRef.current = null;
          setStickyCardData(null);
          updatePhase("idle");
        }, 800);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard, isMoving, isUnderReview]);


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

    if (queryRoom) {
      if (queryRole === "guru") {
        // Guru always re-joins the socket room on board load.
        socket?.emit("room:join", { roomCode: queryRoom, role: "guru" });
      } else {
        // Student re-joins. 
        // We use the name from state (Zustand persist) or local storage.
        const savedName = myGroupName || localStorage.getItem(`eduboard_name_${queryRoom}`);
        if (savedName) {
          joinRoom(queryRoom, savedName);
        } else {
          // Fallback if no name found, just join the room to get updates
          socket?.emit("room:join", { roomCode: queryRoom, role: "siswa" });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);



  const displayCard = currentCard ?? stickyCardData;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const isCardActive = cardPhase !== "idle";

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-table-bright flex items-center justify-center">
        <Disc3 className="w-12 h-12 text-blue-500 animate-spin opacity-20" />
      </div>
    );
  }

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
         <h2 className="text-xl font-bold text-slate-400">Mengarahkan ke Lobby...</h2>
       </div>
    );
  }

  return (
    <div className="h-screen bg-table-bright flex flex-col font-sans select-none overflow-hidden relative">
      {/* Dynamic Background Glow based on Active Group */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 opacity-20 blur-[150px] ${
        isCardActive ? "bg-orange-400" :
        activeGroupIndex === 0 ? "bg-blue-400" :
        activeGroupIndex === 1 ? "bg-red-400" : "bg-purple-400"
      }`} />

      {/* 1. TOP HUD (Corner Modules) */}
      <div className="fixed top-6 left-6 right-6 flex items-start justify-between pointer-events-none z-50">
        {/* Left Module: Room Info & Monitoring */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-white/70 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/50 shadow-lg">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Room Code</span>
                <span className="text-sm font-black text-[#2c49c5] leading-none tracking-tight">{roomCode}</span>
              </div>
              {role === "guru" && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
            </div>
            
            <button 
              onClick={() => setIsInfoOpen(true)}
              className="w-10 h-10 bg-white/70 backdrop-blur-xl rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-white transition-all border border-white/50 shadow-lg group"
            >
              <Info className="w-5 h-5 transition-transform group-hover:scale-110" />
            </button>
          </div>
          
          {role === "guru" && (
            <div className="bg-blue-500/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/20 inline-flex items-center gap-2 w-fit">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Monitoring Mode</span>
            </div>
          )}
        </div>

        {/* Right Module: Game Status & Controls */}
        <div className="flex items-start gap-3 pointer-events-auto">
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center bg-slate-900/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-slate-800 shadow-xl">
              <Timer className={`w-4 h-4 mr-2.5 ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
              <span className={`text-lg font-mono font-black ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500" : "text-white"}`}>
                {formatTime(globalTimer)}
              </span>
            </div>
            
            {isTimerRunning && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-orange-500 px-3 py-1.5 rounded-xl shadow-lg border border-orange-400 flex items-center gap-2"
              >
                <Clock className="w-3 h-3 text-white animate-spin-slow" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{timer}s</span>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {role === "guru" ? (
              <Link href="/dashboard" className="w-10 h-10 bg-yellow-400 hover:bg-yellow-300 text-yellow-950 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95">
                <LayoutDashboard className="w-5 h-5" />
              </Link>
            ) : (
              <button 
                onClick={() => setIsLeaveConfirmOpen(true)}
                className="w-10 h-10 bg-white/60 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center border border-white transition-all shadow-sm group"
              >
                <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. THE ARENA (Center Board) */}
      <main className="flex-1 relative flex items-center justify-center p-4 lg:p-6 z-10 overflow-hidden" style={{ perspective: "2500px" }}>
        {/* Spotlight Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
        
        {/* The 3D Board - Physical Board Look */}
        <motion.div 
          initial={{ rotateX: 30, y: 50, opacity: 0 }}
          animate={{ rotateX: 25, y: -20, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative transform-gpu"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Subtle drop shadow for the thin board */}
          <div className="absolute inset-0 translate-y-2 bg-black/20 blur-[30px] rounded-[2.5rem]" />
          
          <div className="relative transform scale-[0.55] md:scale-[0.7] lg:scale-[0.8] transition-transform duration-700">
             <BoardCanvas groups={groups} />
          </div>
        </motion.div>
        
        {/* Rest of the arena... */}

        {/* 3. FLOATING LEADERBOARD (Left Side) */}
        {/* 3. PLAYER SIDEBAR (Left Side) - Slim & Compact */}
        <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
          {[...groups]
            .map((g, i) => ({ ...g, originalIndex: i }))
            .sort((a, b) => b.score - a.score)
            .map((g, rank) => {
              const isMyTurn = gameStatus === "PLAYING" && activeGroupIndex === g.originalIndex;
              const isLeader = rank === 0 && g.score > 0 && g.status !== 'SURRENDERED';
              const isSurrendered = g.status === 'SURRENDERED';
              const isOffline = g.isOffline;
              const colors = ["bg-blue-500", "bg-red-500", "bg-purple-500", "bg-emerald-500"];
              
              return (
                <motion.div 
                  key={g.id}
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: rank * 0.05 }}
                  className={`relative flex items-center gap-3 p-1.5 pr-4 rounded-full border transition-all duration-500 ${
                    isMyTurn 
                      ? "bg-white shadow-lg border-blue-400 scale-105 z-10" 
                      : isSurrendered
                        ? "bg-slate-200/50 border-slate-300 scale-90 opacity-60 grayscale"
                        : "bg-white/40 backdrop-blur-md border-white/30 scale-95 opacity-80"
                  }`}
                >
                  {/* Turn Indicator Pulse */}
                  {isMyTurn && (
                    <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-pulse" />
                  )}
 
                   {/* Avatar Section - Smaller */}
                   <div className="relative">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md ${isSurrendered ? "bg-slate-400" : colors[g.originalIndex % colors.length]}`}>
                        <NextImage 
                          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${g.avatar || g.name}`} 
                          alt={g.name}
                          width={40}
                          height={40}
                          className={`w-full h-full object-cover ${isOffline ? "opacity-50 grayscale" : ""}`}
                          unoptimized
                        />
                     </div>

                    {/* Status Badge */}
                    {isOffline && !isSurrendered && (
                      <div className="absolute -bottom-1 -right-1 px-1 bg-slate-900 text-[6px] font-black text-white rounded-full border border-white">
                        OFF
                      </div>
                    )}
                    {isSurrendered && (
                      <div className="absolute -bottom-1 -right-1 px-1 bg-red-600 text-[6px] font-black text-white rounded-full border border-white">
                        OUT
                      </div>
                    )}

                     {/* Winner Medal */}
                     {isLeader && (
                       <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border border-white">
                          <Trophy className="w-2.5 h-2.5 text-yellow-900" />
                       </div>
                     )}
                   </div>

                   {/* Info Section - Compact */}
                   <div className="flex flex-col min-w-[60px]">
                     <span className={`text-[11px] font-black tracking-tight ${isMyTurn ? "text-slate-900" : "text-slate-600"} ${isSurrendered ? "line-through opacity-50" : ""}`}>
                       {g.name}
                     </span>
                     <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-blue-600">{g.score}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Pts</span>
                     </div>
                  </div>

                  {/* Active Marker */}
                  {isMyTurn && (
                    <motion.div 
                      layoutId="active-marker"
                      className="absolute -right-2 w-1.5 h-4 bg-blue-500 rounded-full"
                    />
                  )}
                </motion.div>
              );
            })}
        </div>
      </main>

      {/* 4. ACTION DOCK (Bottom Bar) - SLIM & INTEGRATED */}
      <footer className="h-20 lg:h-24 bg-white/80 backdrop-blur-3xl border-t border-white/50 relative z-40 flex items-center justify-between px-6 lg:px-16 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] lg:rounded-t-[3.5rem]">
        {/* Subtle top reflection */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        
        <div className="flex items-center gap-6 lg:gap-10">
          {/* Empty space for balance or small status icons */}
        </div>

        {/* Central Integrated Controls */}
        <div className="absolute left-1/2 bottom-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-6 lg:gap-12 bg-slate-100/50 backdrop-blur-md p-2 lg:p-3 rounded-[2.5rem] border border-white shadow-inner">
          {/* The Dice - Now next to the cards */}
          <div className="relative -translate-y-6 lg:-translate-y-8 flex items-center justify-center w-20 h-20">
            <Dice
              size={60}
              value={diceValue}
              isRolling={isRolling}
              onClick={() => {
                if (role === "siswa" && activeGroup?.name === myGroupName && !isRolling && !isMoving && !currentCard && !isUnderReview) {
                  rollDice();
                }
              }}
              isMyTurn={role === "siswa" && activeGroup?.name === myGroupName && !isRolling && !isMoving && !currentCard && !isUnderReview}
            />
          </div>

          <div className="flex items-center gap-3 lg:gap-6 -translate-y-6 lg:-translate-y-8">
            <PhysicalDeck type="DASAR" label="Dasar" isDrawn={isCardActive && displayCard?.type === "DASAR"} />
            <PhysicalDeck type="AKSI" label="Aksi" isDrawn={isCardActive && displayCard?.type === "AKSI"} />
            <PhysicalDeck type="TANTANGAN" label="Tantangan" isDrawn={isCardActive && displayCard?.type === "TANTANGAN"} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {role === "guru" && (
            <button
              onClick={nextTurn}
              className="px-5 py-2.5 bg-slate-900 text-white font-black text-[9px] tracking-widest uppercase rounded-xl hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2"
            >
              Skip Turn <LogOut className="w-3 h-3 rotate-180" />
            </button>
          )}
        </div>
      </footer>

      {/* Overlays */}
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

      {/* Global Review Alert for Observers/Students if modal is minimized */}
      <AnimatePresence>
        {isUnderReview && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-orange-400/50 backdrop-blur-xl"
          >
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest">Sesi Penilaian Guru Sedang Berlangsung</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStatus === "FINISHED" && (
          <LeaderboardOverlay groups={groups} role={role} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastResult && (
          <ResultNotification result={lastResult} onClose={clearLastResult} role={role} />
        )}
      </AnimatePresence>

      {/* Real-time Teacher Review Panel */}
      {role === "guru" && (
        <TeacherReviewPanel 
          pendingReviews={pendingReviews} 
          onGrade={gradeSubjektif} 
        />
      )}

      {/* 8. GAME INFO MODAL */}
      <AnimatePresence>
        {isInfoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setIsInfoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden shadow-slate-900/40 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 flex-shrink-0">
                        <Info className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Cara Bermain</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Panduan EduBoard</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsInfoOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: "🎲", title: "Kocok Dadu", desc: "Klik dadu di bagian bawah untuk mengocok. Tim Anda akan maju sesuai angka yang didapat." },
                      { icon: "🃏", title: "Kotak Tantangan", desc: "Jika mendarat di kotak berwarna, ambil kartu dan selesaikan tantangannya." },
                      { icon: "🏆", title: "Kumpulkan Poin", desc: "Setiap jawaban benar akan menambah poin tim Anda. Tim dengan poin terbanyak menang!" },
                      { icon: "🔄", title: "Pantau Giliran", desc: "Glow pada sidebar kiri menunjukkan tim mana yang sedang aktif bermain." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 p-5 rounded-3xl bg-slate-50 border border-slate-100/80 transition-all hover:border-blue-100 hover:bg-blue-50/30 group">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                          <p className="text-xs font-medium text-slate-500 leading-relaxed mt-1">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setIsInfoOpen(false)}
                    className="w-full mt-8 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/30 active:scale-[0.98]"
                  >
                    SAYA MENGERTI
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {isLeaveConfirmOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeaveConfirmOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
              
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Yakin ingin keluar?</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                Jika kamu keluar sekarang, kamu akan dianggap <span className="text-red-600 font-bold underline">menyerah</span> dan tidak bisa masuk kembali ke permainan ini.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    leaveRoom(roomCode, myGroupName!);
                    router.push('/lobby');
                  }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black tracking-widest uppercase text-xs transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Ya, Saya Menyerah
                </button>
                <button
                  onClick={() => setIsLeaveConfirmOpen(false)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black tracking-widest uppercase text-xs transition-all active:scale-95"
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhysicalDeck({ type, label, isDrawn }: { type: string; label: string; isDrawn: boolean }) {
  const accent = 
    type === "DASAR" ? { bg: "bg-[#2c49c5]", text: "text-[#2c49c5]", border: "border-[#2c49c5]/30", glow: "rgba(44,73,197,0.2)" } :
    type === "AKSI" ? { bg: "bg-red-500", text: "text-red-500", border: "border-red-500/30", glow: "rgba(239,68,68,0.2)" } :
    { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/30", glow: "rgba(249,115,22,0.2)" };

  return (
    <motion.div 
      whileHover={{ y: -12, scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="relative cursor-pointer group z-50 pointer-events-auto"
      style={{ width: 85, height: 120 }}
    >
      {/* 1. Stack Layer 3 (Bottom) */}
      <div className="absolute inset-0 translate-x-[6px] translate-y-[6px] bg-slate-300 rounded-xl" />
      {/* 2. Stack Layer 2 (Middle) */}
      <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] bg-slate-200 rounded-xl border border-slate-300" />
      
      {/* 3. Top Card (Face) */}
      <div className={`absolute inset-0 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-white shadow-xl overflow-hidden transition-all duration-500 ${isDrawn ? "opacity-30 scale-95" : "opacity-100"}`}>
        <div className={`absolute inset-0 opacity-[0.05] ${accent.bg}`} style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "12px 12px" }} />
        
        {/* Card Icon Header */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${accent.bg} shadow-lg shadow-black/10`}>
          {type === "DASAR" && <BookOpen className="w-5 h-5 text-white" />}
          {type === "AKSI" && <Target className="w-5 h-5 text-white" />}
          {type === "TANTANGAN" && <Flame className="w-5 h-5 text-white" />}
        </div>
        
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-slate-800`}>{label}</span>
        
        {/* Glossy line */}
        <div className="absolute -top-10 -left-10 w-20 h-40 bg-white/40 rotate-45 pointer-events-none group-hover:left-40 transition-all duration-700" />
      </div>

      {/* Drawing Indicator */}
      {isDrawn && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
        </div>
      )}
    </motion.div>
  );
}

function CardBackFace({ type, className }: { type: string; className?: string }) {
  const accent = 
    type === "DASAR" ? { bg: "bg-[#2c49c5]", glow: "shadow-blue-500/20" } :
    type === "AKSI" ? { bg: "bg-red-500", glow: "shadow-red-500/20" } :
    { bg: "bg-orange-500", glow: "shadow-orange-500/20" };

  return (
    <div className={`absolute inset-0 bg-[#0f172a] border-[6px] border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-2xl ${className || "rounded-[2.5rem]"}`}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      
      {/* Dynamic Glow Pattern */}
      <div className={`absolute w-64 h-64 rounded-full blur-[80px] opacity-20 ${accent.bg}`} />
      
      <div className="relative z-10 w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-sm shadow-inner">
        <div className={`w-12 h-12 rounded-2xl ${accent.bg} flex items-center justify-center shadow-lg ${accent.glow}`}>
           <Award className="w-7 h-7 text-white" />
        </div>
      </div>
      
      <div className="mt-6 flex flex-col items-center">
         <span className="text-[10px] font-black tracking-[0.6em] text-white/40 uppercase">EDUBOARD</span>
         <div className="w-8 h-1 bg-white/10 rounded-full mt-2" />
      </div>
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
    if (phase === "revealed" || isUnderReview) {
      const t = setTimeout(() => setIsFlipped(true), 80);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setIsFlipped(false), 0);
      return () => clearTimeout(t);
    }
  }, [phase, isUnderReview]);

  const flipped = (phase === "revealed" || isUnderReview) ? isFlipped : false;
  const cardType = displayCard?.type ?? "DASAR";
  const isVisible = phase !== "idle" || isUnderReview;

  const positionVariants = {
    hidden: { x: 0, y: 400, scale: 0.1, opacity: 0 },
    drawing: { x: 0, y: 0, scale: 1, opacity: 1 },
    revealed: { x: 0, y: 0, scale: 1, opacity: 1 },
    returning: { x: 0, y: 400, scale: 0.1, opacity: 0 },
  };

  const getPositionTarget = () => {
    if (isUnderReview) return "revealed";
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
            style={{ 
              perspective: 1200, 
              width: "min(360px, 92vw)",
              height: "min(520px, 82vh)" 
            }}
            variants={positionVariants}
            initial="hidden"
            animate={getPositionTarget()}
            transition={getPositionTransition()}
          >
            <motion.div
              className="w-full h-full relative"
              style={{ transformStyle: "preserve-3d" }}
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
  const accent =
    isUnderReview ? { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50" } :
    cardType === "DASAR" ? { bg: "bg-[#2c49c5]", text: "text-[#2c49c5]", light: "bg-blue-50" } :
    cardType === "AKSI" ? { bg: "bg-red-600", text: "text-red-600", light: "bg-red-50" } : 
    { bg: "bg-orange-600", text: "text-orange-600", light: "bg-orange-50" };

  return (
    <div
      className="absolute inset-0 bg-white rounded-[2.5rem] flex flex-col p-8 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-2 border-slate-100"
    >
      {/* Corner Accent */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 ${accent.bg} opacity-10`}
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
      />

      {/* Header Section */}
      <div className="relative z-10 flex items-center justify-between mb-1 pb-1 border-b border-slate-100">
         <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-1 ${accent.text}`}>
              {isUnderReview ? "PENILAIAN GURU" : `KARTU ${cardType}`}
            </p>
            {!isUnderReview && displayCard && (
              <div className="flex items-center gap-2">
                 <span className="text-3xl font-black text-slate-900 tracking-tighter">{displayCard.points}</span>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Poin</span>
              </div>
            )}
         </div>

         {isTimerRunning && !isUnderReview && (
           <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 border-white shadow-lg ${timer <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
              <span className="text-xl font-black font-mono leading-none">{timer}</span>
              <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Sec</span>
           </div>
         )}
      </div>

      <div className="flex-1 flex flex-col relative z-10 min-h-0">
         <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {isUnderReview ? (
            <div className="space-y-6">
              {pendingReviews
                .filter((r) => r.groupId === activeGroup?.id || pendingReviews.length === 1)
                .slice(0, 1) // Only show one at a time for focus
                .map((review) => (
                  <div key={review.id} className="space-y-6">
                    {/* Focus on the Student Answer */}
                    <div className="text-center mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">MENILAI JAWABAN</p>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Tim {review.groupName}</h3>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 p-4 opacity-[0.03]">
                         <ScrollText className="w-20 h-20" />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 text-center">ISI JAWABAN:</p>
                      <p className="text-xl font-bold text-slate-800 italic leading-relaxed text-center relative z-10">
                        &ldquo;{review.answer}&rdquo;
                      </p>
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
                      {isUnderReview ? (
                        <div className="flex flex-col items-center justify-center py-10 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-200 animate-pulse">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                            <Rocket className="w-6 h-6 text-orange-600 animate-bounce" />
                          </div>
                          <p className="text-orange-900 font-black text-center uppercase tracking-widest text-xs">Menunggu Penilaian Guru</p>
                          <p className="text-orange-600/60 font-bold text-[10px] mt-1 italic">Jawabanmu sedang ditinjau...</p>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
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
          <div className="mt-6 pt-6 border-t-2 border-zinc-100">
            {role === "guru" ? (
              <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                     <AlertCircle className="w-4 h-4 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Berikan Penilaian Sekarang</span>
                  </div>

                  {(() => {
                    // CRITICAL FIX: Don't just look for activeGroup.id, look for ANY pending review if the teacher needs to grade.
                    // This prevents "hidden" answers due to turn-sync issues.
                    const review = pendingReviews.find((r) => r.groupId === activeGroup?.id) || pendingReviews[0];
                    if (!review) return null;
                    
                    return (
                      <div className="space-y-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl text-left">
                        <div className="flex items-center justify-between mb-1">
                           <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Pertanyaan:</p>
                           <span className="text-[8px] font-black px-1.5 py-0.5 bg-orange-200 text-orange-700 rounded uppercase">Tim: {review.groupName}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-orange-900 leading-tight">
                            {review.question || "Pertanyaan Tantangan"}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-orange-200">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Jawaban Siswa:</p>
                          <p className="text-lg font-black text-blue-900 italic leading-tight">
                            &ldquo;{review.answer || "Tidak ada jawaban"}&rdquo;
                          </p>
                        </div>
                        <div className="pt-1 flex justify-end">
                          <span className="text-[8px] font-black text-orange-300 uppercase">Max {review.points || 10} PT</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      const review = pendingReviews.find((r) => r.groupId === activeGroup?.id) || pendingReviews[0];
                      if (review) gradeSubjektif(review.id, 0);
                    }}
                    className="flex flex-col items-center gap-1 p-4 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-all shadow-sm group"
                  >
                    <XCircle className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-red-700 text-[10px] tracking-tight uppercase">Salah</span>
                  </button>
                  <button
                    onClick={() => {
                      const r = pendingReviews.find((r) => r.groupId === activeGroup?.id) || pendingReviews[0];
                      if (r) gradeSubjektif(r.id, Math.floor((r.points || 10) / 2));
                    }}
                    className="flex flex-col items-center gap-1 p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-all shadow-sm group"
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin-slow group-hover:animate-none" />
                    <span className="font-black text-orange-700 text-[10px] tracking-tight uppercase">Sebagian (+{Math.floor(( (pendingReviews.find((r) => r.groupId === activeGroup?.id) || pendingReviews[0])?.points || 10) / 2)})</span>
                  </button>
                  <button
                    onClick={() => {
                      const r = pendingReviews.find((r) => r.groupId === activeGroup?.id) || pendingReviews[0];
                      if (r) gradeSubjektif(r.id, r.points || 10);
                    }}
                    className="flex flex-col items-center gap-1 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all shadow-sm group"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-emerald-700 text-[10px] tracking-tight uppercase">Tepat (+{(pendingReviews.find((r) => r.groupId === activeGroup?.id) || pendingReviews[0])?.points || 10})</span>
                  </button>
                </div>
              </div>
            ) : (
              <motion.div 
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-orange-50 border-2 border-orange-200 p-8 rounded-[2rem] text-center shadow-xl shadow-orange-500/5"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-400 rounded-full blur-xl opacity-20 animate-pulse" />
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-orange-100 relative z-10">
                      <Disc3 className="w-8 h-8 text-orange-500 animate-spin-slow" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mb-2">PROSES PENILAIAN</p>
                    <h4 className="text-xl font-black text-orange-900 tracking-tight">Menunggu Guru Menilai...</h4>
                    <p className="text-xs font-medium text-orange-600/70 mt-2 leading-relaxed">
                      Jawaban tim kamu sudah terkirim.<br/>Jangan tutup halaman ini ya!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function LeaderboardOverlay({ groups, role }: { groups: Group[]; role: string }) {
  const router = useRouter();
  
  // Sort: Active/Offline first, then Surrendered. Within groups, sort by score.
  const sortedGroups = [...groups].sort((a, b) => {
    if (a.status === 'SURRENDERED' && b.status !== 'SURRENDERED') return 1;
    if (a.status !== 'SURRENDERED' && b.status === 'SURRENDERED') return -1;
    return b.score - a.score;
  });

  const winner = sortedGroups[0]?.status !== 'SURRENDERED' ? sortedGroups[0] : null;
  const runnersUp = winner ? sortedGroups.slice(1) : sortedGroups;

  useEffect(() => {
    if (!winner) return; // No confetti if no winner
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 500 }; 

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, [winner]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-100 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="max-w-xl w-full min-h-[80vh] bg-slate-900/95 backdrop-blur-3xl border-2 border-white/10 rounded-[3.5rem] p-10 md:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.6)] flex flex-col items-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 blur-[100px] -z-10" />
        
        {winner ? (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            className="text-center mb-12 relative pt-8"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
               <motion.div
                 animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
                 transition={{ duration: 2, repeat: Infinity }}
               >
                 <Trophy className="w-10 h-10 text-yellow-400 filter drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
               </motion.div>
            </div>
            <p className="text-yellow-400 font-black tracking-[0.5em] uppercase text-[10px] mb-4">SANG JUARA</p>
            <h1 className="text-xl md:text-3xl font-black text-white tracking-tighter mb-4 filter drop-shadow-xl">
              {winner.name}
            </h1>
            <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full border border-white/20 backdrop-blur-md">
              <span className="text-xl font-black text-white">{winner.score}</span>
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Total Poin</span>
            </div>
          </motion.div>
        ) : (
          <div className="text-center mb-12 pt-8">
            <XCircle className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400 font-black tracking-[0.5em] uppercase text-[10px] mb-2">SESI BERAKHIR</p>
            <h1 className="text-2xl font-black text-white tracking-tighter mb-2">Semua Tim Menyerah</h1>
            <p className="text-slate-500 text-xs font-medium">Tidak ada pemenang dalam sesi ini.</p>
          </div>
        )}

        <div className="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-8">
          {runnersUp.map((group, index) => {
            const isSurrendered = group.status === 'SURRENDERED';
            const displayRank = winner ? index + 2 : index + 1;

            return (
              <motion.div
                key={group.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className={`bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors group ${isSurrendered ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all">
                    <span className="text-lg font-black text-white/40 group-hover:text-white transition-colors">
                      {isSurrendered ? "—" : displayRank}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight">{group.name}</h4>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                      {isSurrendered ? "Menyerah" : `Peringkat ${displayRank}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xl font-black text-white">{group.score}</span>
                    <p className="text-[9px] font-bold text-white/30 uppercase">Poin</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={() => router.push(role === "guru" ? "/dashboard" : "/lobby")}
          className="mt-10 px-8 py-3 bg-white text-slate-900 rounded-xl font-black tracking-widest uppercase text-xs hover:scale-105 transition-transform shadow-2xl"
        >
          {role === "guru" ? "Kembali ke Dashboard" : "Kembali ke Lobby"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}



function Dice({ size, value, isRolling, onClick, isMyTurn }: { size: number; value: number; isRolling: boolean; onClick?: () => void; isMyTurn?: boolean }) {
  const [shuffleVal, setShuffleVal] = useState(1);

  const faceRotations: Record<number, { x: number; y: number; z: number }> = {
    1: { x: 0, y: 0, z: 0 },
    2: { x: 0, y: -90, z: 0 },
    3: { x: -90, y: 0, z: 0 },
    4: { x: 90, y: 0, z: 0 },
    5: { x: 0, y: 90, z: 0 },
    6: { x: 0, y: 180, z: 0 },
  };

  const targetRotation = faceRotations[value] || faceRotations[1];

  useEffect(() => {
    let interval: any;
    if (isRolling) {
      interval = setInterval(() => {
        setShuffleVal(Math.floor(Math.random() * 6) + 1);
      }, 60);
    }
    return () => clearInterval(interval);
  }, [isRolling]);

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-500 ${isMyTurn ? "cursor-pointer pointer-events-auto" : "pointer-events-none opacity-90"}`}
      style={{ perspective: "1500px", width: size, height: size }}
      onClick={onClick}
    >
      {/* Dock Spotlight */}
      <div className="absolute inset-[-40px] bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />

      {/* Bounce Layer */}
      <motion.div
        animate={isRolling ? { y: [0, -30, 0] } : { y: 0 }}
        transition={isRolling ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 20 }}
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Rotation Layer */}
        <motion.div
          animate={
            isRolling
              ? { 
                  rotateX: [0, 360], 
                  rotateY: [0, 360],
                  scale: 1.1
                }
              : { 
                  rotateX: targetRotation.x, 
                  rotateY: targetRotation.y, 
                  rotateZ: 0,
                  scale: 1
                }
          }
          transition={
            isRolling
              ? { rotateX: { duration: 0.5, repeat: Infinity, ease: "linear" }, rotateY: { duration: 0.7, repeat: Infinity, ease: "linear" }, scale: { duration: 0.2 } }
              : { type: "spring", stiffness: 180, damping: 15, mass: 1 }
          }
          className="w-full h-full bg-slate-200 rounded-lg"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* We use (size/2 - 0.2) to make the faces sit slightly inside/snug */}
          <DieFace val={isRolling ? shuffleVal : 1} size={size + 1} transform={`translateZ(${(size / 2) - 0.2}px)`} />
          <DieFace val={isRolling ? shuffleVal : 6} size={size + 1} transform={`rotateY(180deg) translateZ(${(size / 2) - 0.2}px)`} />
          <DieFace val={isRolling ? shuffleVal : 2} size={size + 1} transform={`rotateY(90deg) translateZ(${(size / 2) - 0.2}px)`} />
          <DieFace val={isRolling ? shuffleVal : 5} size={size + 1} transform={`rotateY(-90deg) translateZ(${(size / 2) - 0.2}px)`} />
          <DieFace val={isRolling ? shuffleVal : 3} size={size + 1} transform={`rotateX(90deg) translateZ(${(size / 2) - 0.2}px)`} />
          <DieFace val={isRolling ? shuffleVal : 4} size={size + 1} transform={`rotateX(-90deg) translateZ(${(size / 2) - 0.2}px)`} />
        </motion.div>
      </motion.div>

      {/* Static Subtle Shadow */}
      <div className="absolute -bottom-8 w-full h-4 bg-black/5 blur-[10px] rounded-full" />
    </div>
  );
}

function DieFace({ val, size, transform }: { val: number; size: number; transform: string }) {
  const dotPositions: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  const dots = dotPositions[val] || [];

  return (
    <div
      className="absolute inset-0 bg-white border-2 border-slate-100 rounded-lg flex items-center justify-center p-2 lg:p-2.5 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.05),0_3px_8px_rgba(0,0,0,0.1)]"
      style={{ transform, backfaceVisibility: "hidden" }}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1 lg:gap-1.5 w-full h-full place-items-center">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-75 ${dots.includes(i) ? "bg-slate-900 scale-100" : "bg-transparent scale-0"}`}
            style={{ width: "28%", height: "28%" }}
          />
        ))}
      </div>
    </div>
  );
}


function ResultNotification({ result, onClose, role }: { result: AnswerResult; onClose: () => void; role: string }) {
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
        {/* Close Button — only visible for students, not teacher */}
        {role !== "guru" && (
          <button 
            onClick={() => onClose ? onClose() : clearLastResult()}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}

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

