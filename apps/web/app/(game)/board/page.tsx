"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import NextImage from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import {
  Timer, LogOut, Clock, LayoutDashboard,
  Trophy, Volume2, VolumeX, SkipForward, Dices,
} from "lucide-react";

import { useGameStore } from "../../../store/gameStore";
import { useGameEngine }       from "../../../components/game/engine/useGameEngine";
import WorldContainer          from "../../../components/game/world/WorldContainer";
import CardDeck                from "../../../components/game/hud/CardDeck";
import CardOverlay             from "../../../components/game/hud/CardOverlay";
import LeaderboardOverlay      from "../../../components/game/hud/LeaderboardOverlay";
import ResultNotification      from "../../../components/game/hud/ResultNotification";
import ConfirmationDialog    from "../../../components/game/hud/ConfirmationDialog";
import PathSelector          from "../../../components/game/hud/PathSelector";
import StarSpinOverlay       from "../../../components/game/hud/StarSpinOverlay";

const TeacherReviewPanel = dynamic(
  () => import("../../../components/game/TeacherReviewPanel"),
  { ssr: false },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DiceController = dynamic(
  () => import("../../../components/game/hud/DiceController"),
  { ssr: false },
);

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Page Wrapper (Suspense boundary required by Next.js for useSearchParams) ─

export default function BoardPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Floating Glassmorphic Container */}
        <div className="relative z-10 w-full max-w-sm bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 md:p-10 landscape-mobile:py-5 landscape-mobile:px-6 landscape-mobile:rounded-2xl shadow-[0_30px_70px_rgba(148,163,184,0.12)] flex flex-col items-center">
          {/* Glowing Animated Icon Assembly */}
          <div className="relative w-24 h-24 mb-8 landscape-mobile:w-14 landscape-mobile:h-14 landscape-mobile:mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2c49c5]/30 animate-spin-slow" />
            <div className="absolute w-16 h-16 rounded-full bg-[#2c49c5]/10 border border-[#2c49c5]/20 animate-ping landscape-mobile:w-10 landscape-mobile:h-10" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2c49c5] to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(44,73,197,0.3)] landscape-mobile:w-8 landscape-mobile:h-8 landscape-mobile:rounded-xl">
              <Trophy className="w-5 h-5 text-white animate-pulse landscape-mobile:w-4 landscape-mobile:h-4" />
            </div>
          </div>

          <p className="text-[10px] font-black text-indigo-600 tracking-[0.3em] uppercase mb-2 landscape-mobile:mb-1 landscape-mobile:text-[8px]">Sinkronisasi</p>
          <h2 className="text-xl md:text-2xl font-serif font-black tracking-wide text-slate-800 mb-3 text-center uppercase landscape-mobile:text-sm landscape-mobile:mb-1.5">MEMULAI ARENA</h2>
          <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed max-w-xs mb-8 text-center landscape-mobile:mb-4.5 landscape-mobile:text-[10px] landscape-mobile:leading-snug">
            Sedang menyiapkan koneksi dan memuat data game.
          </p>

          <div className="flex items-center gap-2 landscape-mobile:gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#2c49c5] rounded-full animate-bounce landscape-mobile:w-2 landscape-mobile:h-2" style={{ animationDelay: "0ms" }} />
            <span className="w-2.5 h-2.5 bg-slate-200 rounded-full animate-bounce landscape-mobile:w-2 landscape-mobile:h-2" style={{ animationDelay: "150ms" }} />
            <span className="w-2.5 h-2.5 bg-[#2c49c5]/70 rounded-full animate-bounce landscape-mobile:w-2 landscape-mobile:h-2" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    }>
      <BoardPage />
    </Suspense>
  );
}

// ─── Main Board Page ──────────────────────────────────────────────────────────

function BoardPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const role         = searchParams?.get("role") ?? "siswa";

  const {
    groups, activeGroupIndex, timer, globalTimer, gameStatus,
    roomCode, isTimerRunning, currentCard, myGroupName,
    submitAnswerObjektif, submitAnswerSubjektif, gradeSubjektif,
    nextTurn, pendingReviews, rollDice, isRolling, diceValue,
    isMoving, leaveRoom, lastResult, clearLastResult,
    fetchQuestions, isGuru, roomConfig,
    isMuted, toggleMute, isChoosingPath, hasRolled,
    isSpinningStar, exitToLobby,
  } = useGameStore();

  const engine = useGameEngine(role);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [diceSize, setDiceSize] = useState(75);
  const [showRollReminder, setShowRollReminder] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 1024);
      setIsLandscapeMobile(height <= 600 && width > height && width < 1024);
      if (height <= 600 && width > height && width < 1024) {
        setDiceSize(42); // Landscape mobile
      } else if (width < 768) {
        setDiceSize(52); // Mobile
      } else if (width < 1024) {
        setDiceSize(68); // Tablet
      } else {
        setDiceSize(75); // Desktop/Laptop
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const activeGroup = groups[activeGroupIndex];

  // Fetch questions (guru only)
  useEffect(() => {
    if (isGuru && roomCode && roomConfig.questionSetId) {
      fetchQuestions(roomConfig.questionSetId, 1, false, 999);
    }
  }, [fetchQuestions, isGuru, roomCode, roomConfig.questionSetId]);

  // Sync roomCode from URL
  useEffect(() => {
    const queryRoom = searchParams?.get("roomCode");
    if (queryRoom && queryRoom !== roomCode) {
      useGameStore.setState({ roomCode: queryRoom });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Redirect if not in a room
  useEffect(() => {
    if (!roomCode && gameStatus === "IDLE") {
      const t = setTimeout(() => {
        if (!useGameStore.getState().roomCode) {
          router.push(role === "guru" ? "/dashboard" : "/lobby");
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [roomCode, gameStatus, router, role]);

  // Confetti on finish
  useEffect(() => {
    if (gameStatus !== "FINISHED") return;
    // Kurangi efek di mobile: lebih sedikit partikel & durasi lebih singkat
    const isMobileDevice = window.innerWidth < 1024;
    const duration = isMobileDevice ? 1500 : 3000;
    const count    = isMobileDevice ? 2 : 5;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ zIndex: 10000, particleCount: count, angle: 60,  spread: 55, origin: { x: 0 }, colors: ["#3b82f6", "#10b981", "#f59e0b"] });
      confetti({ zIndex: 10000, particleCount: count, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#3b82f6", "#10b981", "#f59e0b"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [gameStatus]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const { cardPhase, displayCard, isCardActive, isUnderReview,
          tantanganText, setTantanganText, isSubmitting, setIsSubmitting } = engine;

  const canRoll = role === "siswa"
    && activeGroup?.name?.trim().toLowerCase() === myGroupName?.trim().toLowerCase()
    && !hasRolled && !isRolling && !isMoving && !currentCard && !isUnderReview;

  // Dice roll reminder timer (triggers after 3 seconds of inactive turn)
  useEffect(() => {
    if (!canRoll) return;

    const reminderTimer = setTimeout(() => {
      setShowRollReminder(true);
    }, 3000);

    return () => {
      clearTimeout(reminderTimer);
      setShowRollReminder(false);
    };
  }, [canRoll]);

  // Lock body scroll when any dialog/overlay is active to prevent scroll-chaining on mobile devices
  useEffect(() => {
    const isAnyOverlayOpen = 
      (cardPhase !== "idle") ||
      isUnderReview ||
      showExitConfirm ||
      showLeaderboardModal ||
      (gameStatus === "FINISHED") ||
      !!lastResult ||
      isChoosingPath ||
      isSpinningStar;

    if (isAnyOverlayOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100%";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.height = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    };
  }, [
    cardPhase,
    isUnderReview,
    showExitConfirm,
    showLeaderboardModal,
    gameStatus,
    lastResult,
    isChoosingPath,
    isSpinningStar
  ]);

  // ── Loading states (Unified Light-Theme State Machine) ──────────────────────

  const isWaitingForGuru = !activeGroup && gameStatus !== "FINISHED" && gameStatus !== "IDLE";
  const isRedirectingToLobby = !roomCode && gameStatus === "IDLE";
  const showLoadingOverlay = isWaitingForGuru || isRedirectingToLobby || !isMapLoaded;

  let loadingCategory = "Sinkronisasi";
  let loadingTitle = "MEMUAT PAPAN";
  let loadingDesc = "Sedang memproses peta, mensinkronisasikan dadu, dan menyiapkan ubin permainan.";

  if (isWaitingForGuru) {
    loadingCategory = "Pemberitahuan Sistem";
    loadingTitle = "MEMPERSIAPKAN ARENA";
    loadingDesc = "Menunggu Guru menekan tombol \"Mulai Permainan\" di layar utama lobi.";
  } else if (isRedirectingToLobby) {
    loadingCategory = "Navigasi";
    loadingTitle = "MENGARAHKAN...";
    loadingDesc = "Sedang bersiap kembali ke Ruang Lobi utama.";
  }



  // Dynamic top offset positioning based on role to prevent overlap with "Monitoring Mode" badge (teacher only)
  const standingsTopClass = role === "guru"
    ? "top-[84px] md:top-[124px]"
    : "top-[52px] md:top-[88px]";

  const sidebarTopClass = role === "guru"
    ? "top-[132px]"
    : "top-[96px]";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#1c1917] flex flex-col font-sans select-none overflow-hidden relative text-white">
      {/* ── STONE TEXTURE BACKGROUND ─────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Base Stone Color & Noise */}
        <div className="absolute inset-0 bg-[#131110]" />
        <div 
          className="absolute inset-0 opacity-[0.05]" 
          style={{ 
            backgroundImage: `url("https://www.transparenttextures.com/patterns/carbon-fibre.png")`,
            filter: 'contrast(150%) brightness(50%)'
          }} 
        />
        
        {/* Stone Cracks/Veins Effect via Gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.02)_52%,transparent_55%)] bg-[length:200px_200px]" />
        <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_40%,rgba(0,0,0,0.1)_50%,transparent_60%)] bg-[length:300px_300px]" />
        
        {/* Atmospheric Lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(68,64,60,0.2),transparent)]" />
      </div>

      {/* Dynamic Background Glow */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 opacity-20 blur-[150px] ${
        isCardActive        ? "bg-orange-400" :
        activeGroupIndex === 0 ? "bg-blue-400"   :
        activeGroupIndex === 1 ? "bg-red-400"    : "bg-purple-400"
      }`} />

      {/* ── TOP HUD ─────────────────────────────────────────────────────────── */}
      <div className="fixed top-3 left-3 right-3 sm:top-6 sm:left-6 sm:right-6 landscape-mobile:top-2 landscape-mobile:left-2 landscape-mobile:right-2 flex items-start justify-between pointer-events-none z-50">
        {/* Left: Room info */}
        <div className="flex flex-col gap-1.5 sm:gap-2 landscape-mobile:gap-1 pointer-events-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 landscape-mobile:gap-1">
            <div className="flex items-center gap-2 sm:gap-3 landscape-mobile:gap-1.5 bg-white/70 backdrop-blur-xl px-2.5 py-1.5 sm:px-4 sm:py-2 landscape-mobile:px-2 landscape-mobile:py-1 rounded-lg sm:rounded-xl landscape-mobile:rounded-md border border-white/50 shadow-lg">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 hidden sm:inline">Room Code</span>
                <span className="text-xs sm:text-sm landscape-mobile:text-xs font-black text-[#2c49c5] leading-none tracking-tight flex items-center gap-1">
                  <span className="sm:hidden text-slate-400 text-[8px] font-bold tracking-tight">ROOM:</span>
                  {roomCode}
                </span>
              </div>
              {role === "guru" && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 landscape-mobile:w-1.5 landscape-mobile:h-1.5 bg-blue-500 rounded-full animate-pulse" />}
            </div>

            <button
              onClick={toggleMute}
              className={`w-8 h-8 sm:w-10 sm:h-10 landscape-mobile:w-7 landscape-mobile:h-7 backdrop-blur-xl rounded-xl sm:rounded-2xl landscape-mobile:rounded-lg flex items-center justify-center transition-all border shadow-lg group cursor-pointer ${
                isMuted
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  : "bg-white/70 border-white/50 text-slate-400 hover:text-blue-500 hover:bg-white"
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 landscape-mobile:w-3.5 landscape-mobile:h-3.5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 landscape-mobile:w-3.5 landscape-mobile:h-3.5" />}
            </button>
          </div>

          {role === "guru" && (
            <div className="bg-white/70 backdrop-blur-xl px-2.5 py-1.5 sm:px-3 sm:py-1.5 landscape-mobile:px-1.5 landscape-mobile:py-1 rounded-lg sm:rounded-xl landscape-mobile:rounded-md border border-white/50 inline-flex items-center gap-1.5 sm:gap-2 landscape-mobile:gap-1 w-fit shadow-md">
              <div className="w-1.5 h-1.5 bg-[#2c49c5] rounded-full animate-pulse shadow-[0_0_8px_rgba(44,73,197,0.8)]" />
              <span className="text-[7px] sm:text-[9px] landscape-mobile:text-[6px] font-black text-[#2c49c5] uppercase tracking-[0.15em] leading-none">Monitoring Mode</span>
            </div>
          )}
        </div>

        {/* Right: Global timer + controls */}
        <div className="flex items-start gap-1.5 sm:gap-3 landscape-mobile:gap-1 pointer-events-auto">
          <div className="flex flex-col items-end gap-1.5 sm:gap-2 landscape-mobile:gap-1">
            <div className="flex items-center bg-slate-900/90 backdrop-blur-xl px-2.5 py-1.5 sm:px-4 sm:py-2 landscape-mobile:px-2 landscape-mobile:py-1 rounded-md sm:rounded-lg landscape-mobile:rounded-md border border-slate-800 shadow-xl">
              <Timer className={`w-3.5 h-3.5 sm:w-4 sm:h-4 landscape-mobile:w-3 landscape-mobile:h-3 mr-1.5 sm:mr-2.5 landscape-mobile:mr-1 ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
              <span className={`text-sm sm:text-lg landscape-mobile:text-xs font-mono font-black ${globalTimer <= 60 && globalTimer > 0 ? "text-red-500" : "text-white"} leading-none`}>
                {formatTime(globalTimer)}
              </span>
            </div>

            {isTimerRunning && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-orange-500 px-2 py-1 sm:px-3 sm:py-1.5 landscape-mobile:px-1.5 landscape-mobile:py-0.5 rounded-lg sm:rounded-xl landscape-mobile:rounded-md shadow-lg border border-orange-400 flex items-center gap-1.5 sm:gap-2 landscape-mobile:gap-1"
              >
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 landscape-mobile:w-2 landscape-mobile:h-2 text-white animate-spin-slow" />
                <span className="text-[8px] sm:text-[10px] landscape-mobile:text-[7px] font-black text-white uppercase tracking-widest italic leading-none">{timer}s</span>
              </motion.div>
            )}
          </div>

          {role === "guru" ? (
            <div className="flex flex-col items-end gap-1.5 sm:gap-2 landscape-mobile:gap-1">
              <Link 
                href="/dashboard" 
                className="w-8 h-8 sm:w-10 sm:h-10 landscape-mobile:w-7 landscape-mobile:h-7 bg-yellow-400 hover:bg-yellow-300 text-yellow-950 rounded-xl landscape-mobile:rounded-lg flex items-center justify-center shadow-lg transition-all active:scale-95 group relative"
              >
                <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 landscape-mobile:w-3.5 landscape-mobile:h-3.5" />
                {/* Tooltip */}
                <div className="absolute top-full mt-2 right-0 bg-slate-950/95 backdrop-blur-md text-[8px] sm:text-[9px] font-black text-white px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all origin-top-right duration-150 pointer-events-none whitespace-nowrap z-50">
                  Kembali ke Dashboard
                  <div className="absolute top-[-3.5px] right-3.5 w-1.5 h-1.5 bg-slate-950 rotate-45 border-l border-t border-slate-800" />
                </div>
              </Link>

              {/* Compact Skip Turn for Mobile/Tablet (Placed Under Dashboard Link - Horizontal flex) */}
              <button
                onClick={() => {
                  nextTurn();
                  toast.success("Giliran berhasil dilompati!");
                }}
                className="w-fit px-2.5 sm:px-3.5 h-6 md:h-10 landscape-mobile:h-7 bg-slate-900/90 hover:bg-slate-800 text-white rounded-md flex items-center justify-center gap-1 sm:gap-1.5 border border-slate-800 shadow-lg transition-all active:scale-95 group relative cursor-pointer lg:hidden mt-2 landscape-mobile:mt-1"
              >
                <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 landscape-mobile:w-3 landscape-mobile:h-3 text-white" />
                <span className="text-[7px] sm:text-[9px] landscape-mobile:text-[7px] font-black uppercase tracking-wider text-slate-300 leading-none">SKIP</span>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 right-0 bg-slate-950/95 backdrop-blur-md text-[8px] sm:text-[9px] font-black text-white px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all origin-top-right duration-150 pointer-events-none whitespace-nowrap z-50">
                  Lompati Giliran
                  <div className="absolute top-[-3.5px] right-3.5 w-1.5 h-1.5 bg-slate-950 rotate-45 border-l border-t border-slate-800" />
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 landscape-mobile:w-7 landscape-mobile:h-7 bg-red-500/80 hover:bg-red-600 text-white rounded-xl landscape-mobile:rounded-lg flex items-center justify-center border border-red-400/40 shadow-lg shadow-red-500/10 transition-all active:scale-95 group relative cursor-pointer"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 landscape-mobile:w-3.5 landscape-mobile:h-3.5" />
              {/* Tooltip */}
              <div className="absolute top-full mt-2 right-0 bg-slate-950/95 backdrop-blur-md text-[8px] sm:text-[9px] font-black text-white px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all origin-top-right duration-150 pointer-events-none whitespace-nowrap z-50">
                Keluar Game
                <div className="absolute top-[-3.5px] right-3.5 w-1.5 h-1.5 bg-slate-950 rotate-45 border-l border-t border-slate-800" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── ARENA (Board) ────────────────────────────────────────────────────── */}
      <main className="flex-1 absolute inset-0 z-0 overflow-hidden w-full h-full" style={{ perspective: "2500px" }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
        <WorldContainer groups={groups} onMapLoaded={() => setIsMapLoaded(true)} />

        {/* ── PLAYER SIDEBAR (DESKTOP) & HORIZONTAL SCROLL BAR (MOBILE) ────────── */}
        {(!isMobile || isLandscapeMobile) ? (
          <div className={`fixed ${sidebarTopClass} landscape-mobile:top-[68px] left-6 landscape-mobile:left-3 flex flex-col gap-1.5 sm:gap-2 landscape-mobile:gap-1 z-30 transition-all duration-300 max-h-[76vh] landscape-mobile:max-h-[82vh] w-fit min-w-[140px] sm:min-w-[185px] landscape-mobile:min-w-[120px] landscape-mobile:max-w-[125px] opacity-100 scale-100 pointer-events-auto`}>
            {/* CTA Leaderboard Button */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowLeaderboardModal(true)}
              className="flex items-center gap-2 landscape-mobile:gap-1 px-3.5 py-2 landscape-mobile:px-2.5 landscape-mobile:py-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xl border border-slate-800 hover:border-slate-700 rounded-xl landscape-mobile:rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xl w-fit pointer-events-auto mb-2 landscape-mobile:mb-2.5 text-white group"
            >
              <Trophy className="w-3.5 h-3.5 landscape-mobile:w-3 landscape-mobile:h-3 text-yellow-400 group-hover:animate-bounce" />
              <span className="text-[9px] landscape-mobile:text-[8px] font-black uppercase tracking-widest leading-none">Papan Skor</span>
            </motion.div>

            {/* Scrollable Player List Wrapper */}
            <div className="overflow-y-auto overflow-x-visible px-2.5 py-1.5 landscape-mobile:px-1.5 landscape-mobile:py-1 space-y-2.5 landscape-mobile:space-y-1.5 custom-scrollbar max-h-[64vh] landscape-mobile:max-h-[66vh] w-full">
              {[...groups]
                .map((g, i) => ({ ...g, originalIndex: i }))
                .sort((a, b) => b.score - a.score)
                .map((g, rank) => {
                  const isMyTurn    = gameStatus === "PLAYING" && activeGroupIndex === g.originalIndex;
                  const isLeader    = rank === 0 && g.score > 0 && g.status !== "SURRENDERED";
                  const isSurrendered = g.status === "SURRENDERED";

                  return (
                    <motion.div
                      key={g.id}
                      layout
                      initial={{ x: -40, opacity: 0 }}
                      animate={{
                        x: 0,
                        opacity: isSurrendered ? 0.6 : 1,
                        scale: isMyTurn ? 1.05 : 1,
                        backgroundColor: isMyTurn 
                          ? "rgba(255, 255, 255, 1)" 
                          : isSurrendered 
                          ? "rgba(226, 232, 240, 0.5)" 
                          : "rgba(255, 255, 255, 0.4)",
                        borderColor: isMyTurn 
                          ? "rgba(59, 130, 246, 1)" 
                          : isSurrendered 
                          ? "rgba(203, 213, 225, 0.5)" 
                          : "rgba(255, 255, 255, 0.3)"
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 24,
                        mass: 0.8
                      }}
                      whileHover={{ x: 3, scale: isMyTurn ? 1.07 : 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowLeaderboardModal(true)}
                      className={`relative flex items-center gap-3 landscape-mobile:gap-1.5 p-2 pr-8 landscape-mobile:p-1.5 landscape-mobile:pr-4 rounded-xl landscape-mobile:rounded-lg border cursor-pointer pointer-events-auto shadow-md hover:shadow-lg ${
                        isMyTurn
                          ? "z-10 shadow-[0_4px_20px_rgba(59,130,246,0.12)]"
                          : isSurrendered
                          ? "grayscale"
                          : "backdrop-blur-md"
                      }`}
                    >
                      {isMyTurn && <div className="absolute inset-0 rounded-xl landscape-mobile:rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.25)] animate-pulse" />}

                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 landscape-mobile:w-7 landscape-mobile:h-7 rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center"
                             style={{ backgroundColor: g.color || "#3b82f6" }}>
                          <NextImage
                            src={`https://api.dicebear.com/7.x/adventurer/png?seed=${g.avatar || g.name}`}
                            alt={g.name} width={40} height={40}
                            className={`w-full h-full object-cover ${g.isOffline ? "opacity-50 grayscale" : ""}`}
                            unoptimized
                          />
                        </div>
                        {g.isOffline && !isSurrendered && (
                          <div className="absolute -bottom-0.5 -right-0.5 px-0.5 bg-slate-900 text-[6px] font-black text-white rounded-full border border-white">OFF</div>
                        )}
                        {isSurrendered && (
                          <div className="absolute -bottom-0.5 -right-0.5 px-0.5 bg-red-600 text-[6px] font-black text-white rounded-full border border-white">OUT</div>
                        )}
                        {isLeader && (
                          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 landscape-mobile:w-4 landscape-mobile:h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border border-white">
                            <Trophy className="w-2.5 h-2.5 landscape-mobile:w-2 landscape-mobile:h-2 text-yellow-950" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-[60px] landscape-mobile:min-w-[45px]">
                        <span className={`text-[11px] landscape-mobile:text-[9.5px] font-black tracking-tight leading-none mb-0.5 ${isMyTurn ? "text-slate-900" : "text-slate-600"} ${isSurrendered ? "line-through opacity-50" : ""}`}>
                          {g.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] landscape-mobile:text-[8.5px] font-black text-blue-600 leading-none">{g.score}</span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Pts</span>
                        </div>
                      </div>

                      {isMyTurn && (
                        <motion.div layoutId="active-marker" className="absolute right-2.5 landscape-mobile:right-1.5 w-1.5 h-4 landscape-mobile:h-3 bg-blue-500 rounded-full" />
                      )}
                    </motion.div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Mobile & Tablet Horizontal Scrollable Player list directly below HUD */
          <div className={`fixed ${standingsTopClass} left-3 md:left-6 right-3 md:right-6 z-30 flex items-center gap-2 md:gap-4.5 overflow-x-auto py-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pointer-events-auto scroll-smooth`}>
            {/* Compact Leaderboard CTA Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowLeaderboardModal(true)}
              className="flex flex-col items-center justify-center w-[46px] md:w-[68px] h-[38px] md:h-[50px] bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-lg md:rounded-xl flex-shrink-0 cursor-pointer shadow-md text-yellow-400 active:scale-95 transition-all"
            >
              <Trophy className="w-3.5 md:w-5 h-3.5 md:h-5" />
              <span className="text-[6.5px] md:text-[8.5px] font-black uppercase tracking-tighter leading-none mt-0.5">Skor</span>
            </motion.button>

            {[...groups]
              .map((g, i) => ({ ...g, originalIndex: i }))
              .sort((a, b) => b.score - a.score)
              .map((g, rank) => {
                const isMyTurn    = gameStatus === "PLAYING" && activeGroupIndex === g.originalIndex;
                const isLeader    = rank === 0 && g.score > 0 && g.status !== "SURRENDERED";
                const isSurrendered = g.status === "SURRENDERED";

                return (
                  <motion.div
                    key={g.id}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      opacity: isSurrendered ? 0.6 : 0.9,
                      scale: isMyTurn ? 1.05 : 1,
                      backgroundColor: isMyTurn
                        ? "rgba(255, 255, 255, 1)"
                        : isSurrendered
                        ? "rgba(226, 232, 240, 0.5)"
                        : "rgba(28, 25, 23, 0.8)", // bg-stone-900/80 is stone-950/stone-900
                      borderColor: isMyTurn
                        ? "rgba(59, 130, 246, 1)"
                        : isSurrendered
                        ? "rgba(203, 213, 225, 0.5)"
                        : "rgba(255, 255, 255, 0.1)"
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 24,
                      mass: 0.8
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowLeaderboardModal(true)}
                    className={`flex items-center gap-1.5 md:gap-3 p-1 md:p-2 pr-2.5 md:pr-5 md:pl-2.5 rounded-lg md:rounded-xl border flex-shrink-0 min-w-[95px] md:min-w-[160px] max-w-[120px] md:max-w-[190px] cursor-pointer shadow-sm relative ${
                      isMyTurn
                        ? "shadow-[0_2px_10px_rgba(59,130,246,0.18)]"
                        : isSurrendered
                        ? "grayscale"
                        : "backdrop-blur-md"
                    }`}
                  >
                    {isMyTurn && <div className="absolute inset-0 rounded-lg md:rounded-xl shadow-[0_0_8px_rgba(59,130,246,0.3)] animate-pulse" />}

                    <div className="relative flex-shrink-0">
                      <div className="w-6.5 h-6.5 md:w-10 md:h-10 rounded-full overflow-hidden border border-white shadow flex items-center justify-center flex-shrink-0"
                           style={{ backgroundColor: g.color || "#3b82f6" }}>
                        <NextImage
                          src={`https://api.dicebear.com/7.x/adventurer/png?seed=${g.avatar || g.name}`}
                          alt={g.name} width={26} height={26}
                          className={`w-full h-full object-cover ${g.isOffline ? "opacity-50 grayscale" : ""}`}
                          unoptimized
                        />
                      </div>
                      {g.isOffline && !isSurrendered && (
                        <div className="absolute -bottom-0.5 -right-0.5 px-0.5 md:px-1 bg-slate-900 text-[4px] md:text-[6px] font-black text-white rounded-full border border-white">OFF</div>
                      )}
                      {isSurrendered && (
                        <div className="absolute -bottom-0.5 -right-0.5 px-0.5 md:px-1 bg-red-600 text-[4px] md:text-[6px] font-black text-white rounded-full border border-white">OUT</div>
                      )}
                      {isLeader && (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 md:w-5 md:h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow border border-white">
                          <Trophy className="w-1.5 md:w-3 h-1.5 md:h-3 text-yellow-900" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-[45px] md:min-w-[75px] truncate">
                      <span className={`text-[8.5px] md:text-[12px] font-black tracking-tight leading-none mb-0.5 truncate ${isMyTurn ? "text-slate-900" : "text-white"} ${isSurrendered ? "line-through opacity-50" : ""}`}>
                        {g.name}
                      </span>
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <span className="text-[8px] md:text-[10px] font-black text-blue-500 leading-none">{g.score}</span>
                        <span className="text-[5.5px] md:text-[7px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Pts</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </main>

      {/* ── BOTTOM ACTION DOCK ───────────────────────────────────────────────── */}
      <footer className="h-20 lg:h-24 landscape-mobile:h-12 fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 lg:px-16 pointer-events-none">
        <div /> {/* Left spacer */}

        {/* Center: Dice + Card Decks */}
        <div className="absolute left-1/2 bottom-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-3 sm:gap-8 lg:gap-12 landscape-mobile:gap-2.5 bg-slate-100/50 backdrop-blur-md p-1.5 sm:px-7 sm:py-3.5 lg:p-3 landscape-mobile:p-1 rounded-[1.8rem] sm:rounded-[2.5rem] landscape-mobile:rounded-2xl border border-white shadow-inner pointer-events-auto max-w-[95vw] sm:max-w-none">
          <div className="relative -translate-y-4 sm:-translate-y-6 lg:-translate-y-8 landscape-mobile:-translate-y-2 flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 landscape-mobile:w-11 landscape-mobile:h-11">
            <DiceController
              size={diceSize}
              value={diceValue}
              isRolling={isRolling}
              isMyTurn={canRoll}
              onClick={() => canRoll && rollDice()}
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-4.5 lg:gap-6 landscape-mobile:gap-1.5 -translate-y-4 sm:-translate-y-6 lg:-translate-y-8 landscape-mobile:-translate-y-2">
            <CardDeck type="DASAR"     label="Dasar"     isDrawn={isCardActive && displayCard?.type === "DASAR"}     />
            <CardDeck type="TANTANGAN" label="Tantangan" isDrawn={isCardActive && displayCard?.type === "TANTANGAN"} />
            <CardDeck type="PEMAHAMAN" label="Pemahaman" isDrawn={isCardActive && displayCard?.type === "PEMAHAMAN"} />
          </div>
        </div>

        {/* Right: Skip turn (guru) */}
        <div className="flex items-center gap-4 pointer-events-auto">
          {role === "guru" && (
            <div className="relative group">
              <button
                onClick={() => {
                  nextTurn();
                  toast.success("Giliran berhasil dilompati!");
                }}
                className="hidden lg:flex px-5 py-2.5 bg-slate-900 text-white font-black text-[9px] tracking-widest uppercase rounded-xl hover:bg-slate-800 transition-all shadow-xl items-center gap-2 cursor-pointer"
              >
                Skip Turn <SkipForward className="w-3 h-3 text-white" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 right-0 bg-slate-950/95 backdrop-blur-md text-[8px] sm:text-[9px] font-black text-white px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all origin-bottom-right duration-150 pointer-events-none whitespace-nowrap z-50">
                Lompati Giliran Kelompok Aktif
                <div className="absolute top-full right-4 w-1.5 h-1.5 bg-slate-950 rotate-45 border-r border-b border-slate-800" />
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* ── OVERLAYS ─────────────────────────────────────────────────────────── */}

      {/* Card Overlay (Force-closed when game finishes) */}
      {gameStatus !== "FINISHED" && (
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
          setIsSubmitting={setIsSubmitting}
          isSubmitting={isSubmitting}
          pendingReviews={pendingReviews}
        />
      )}

      {/* Under-review banner (Force-closed when game finishes) */}
      <AnimatePresence>
        {isUnderReview && gameStatus !== "FINISHED" && (
          <motion.div
            initial={{ y: -50, x: "-50%", opacity: 0 }}
            animate={{ y: 24, x: "-50%", opacity: 1 }}
            exit={{ y: -50, x: "-50%", opacity: 0 }}
            className="fixed top-0 left-1/2 z-[150] bg-white/90 backdrop-blur-xl px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-2 sm:gap-3 border border-indigo-200"
          >
            <div className="relative flex items-center justify-center flex-shrink-0">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-indigo-500 rounded-full relative z-10" />
            </div>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-indigo-600 whitespace-nowrap">
              {isMobile ? "Penilaian Guru" : "Sesi Penilaian Guru Berlangsung"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROLL REMINDER BANNER (Blinking / Pulse - Force-closed when game finishes) ── */}
      <AnimatePresence>
        {showRollReminder && gameStatus !== "FINISHED" && (
          <motion.div
            initial={{ y: -50, x: "-50%", opacity: 0 }}
            animate={{ y: 24, x: "-50%", opacity: 1 }}
            exit={{ y: -50, x: "-50%", opacity: 0 }}
            className="fixed top-0 left-1/2 z-[100] pointer-events-none flex flex-col items-center"
          >
            <div className="bg-amber-500/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-amber-400 shadow-[0_10px_30px_rgba(245,158,11,0.3)] flex items-center gap-1.5 sm:gap-2 animate-pulse">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-white/40 rounded-full animate-ping" />
                <Dices className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              <span className="text-[8px] sm:text-xs font-black uppercase tracking-wider text-white">
                Giliranmu! Lempar dadu
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard / Papan Skor */}
      <AnimatePresence>
        {gameStatus === "FINISHED" && (
          <LeaderboardOverlay
            groups={groups}
            role={role}
            onNavigateBack={role === "guru" ? undefined : exitToLobby}
          />
        )}
        {showLeaderboardModal && (
          <LeaderboardOverlay
            groups={groups}
            role={role}
            isMidGame={true}
            onClose={() => setShowLeaderboardModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Result notification (Force-closed when game finishes) */}
      <AnimatePresence>
        {lastResult && gameStatus !== "FINISHED" && cardPhase === "idle" && (
          <ResultNotification result={lastResult} onClose={() => clearLastResult()} />
        )}
      </AnimatePresence>

      {/* Path Selector — muncul saat di persimpangan STAR (Force-closed when game finishes) */}
      {gameStatus !== "FINISHED" && (
        <PathSelector
          isMyTurn={role === "siswa" && activeGroup?.name?.trim().toLowerCase() === myGroupName?.trim().toLowerCase()}
          activeGroupName={activeGroup?.name ?? "..."}
        />
      )}

      {/* Exit confirmation dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirm}
        title="Keluar Permainan?"
        description="Anda akan dianggap menyerah jika keluar sekarang. Skor yang sudah didapat akan tetap tersimpan."
        confirmLabel="Ya, Keluar"
        cancelLabel="Tetap Bermain"
        onConfirm={() => {
          leaveRoom(roomCode, myGroupName!);
          router.push("/lobby");
        }}
        onCancel={() => setShowExitConfirm(false)}
      />

      {/* Teacher Review Panel (Force-closed when game finishes) */}
      {role === "guru" && gameStatus !== "FINISHED" && (
        <TeacherReviewPanel pendingReviews={pendingReviews} onGrade={gradeSubjektif} />
      )}

      {/* Roda Putar STAR (Force-closed when game finishes) */}
      {gameStatus !== "FINISHED" && <StarSpinOverlay />}

      {/* Full-screen Loading Screen Overlay — stays active until 3D map is completely loaded */}
      <AnimatePresence>
        {showLoadingOverlay && (
          <motion.div
            key="page-map-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center z-[1000] overflow-hidden"
          >
            {/* Floating Glassmorphic Container */}
            <div className="relative z-10 w-full max-w-sm bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 md:p-10 landscape-mobile:py-5 landscape-mobile:px-6 landscape-mobile:rounded-2xl shadow-[0_30px_70px_rgba(148,163,184,0.12)] flex flex-col items-center">
              {/* Glowing Animated Icon Assembly */}
              <div className="relative w-24 h-24 mb-8 landscape-mobile:w-14 landscape-mobile:h-14 landscape-mobile:mb-3 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2c49c5]/30 animate-spin-slow" />
                <div className="absolute w-16 h-16 rounded-full bg-[#2c49c5]/10 border border-[#2c49c5]/20 animate-ping landscape-mobile:w-10 landscape-mobile:h-10" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2c49c5] to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(44,73,197,0.3)] landscape-mobile:w-8 landscape-mobile:h-8 landscape-mobile:rounded-xl">
                  <Trophy className="w-5 h-5 text-white animate-pulse landscape-mobile:w-4 landscape-mobile:h-4" />
                </div>
              </div>

              <p className="text-[10px] font-black text-indigo-600 tracking-[0.3em] uppercase mb-2 landscape-mobile:mb-1 landscape-mobile:text-[8px]">{loadingCategory}</p>
              <h2 className="text-xl md:text-2xl font-serif font-black tracking-wide text-slate-800 mb-3 text-center uppercase landscape-mobile:text-sm landscape-mobile:mb-1.5">{loadingTitle}</h2>
              <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed max-w-xs mb-8 text-center landscape-mobile:mb-4.5 landscape-mobile:text-[10px] landscape-mobile:leading-snug">
                {loadingDesc}
              </p>

              <div className="flex items-center gap-2 landscape-mobile:gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#2c49c5] rounded-full animate-bounce landscape-mobile:w-2 landscape-mobile:h-2" style={{ animationDelay: "0ms" }} />
                <span className="w-2.5 h-2.5 bg-slate-200 rounded-full animate-bounce landscape-mobile:w-2 landscape-mobile:h-2" style={{ animationDelay: "150ms" }} />
                <span className="w-2.5 h-2.5 bg-[#2c49c5]/70 rounded-full animate-bounce landscape-mobile:w-2 landscape-mobile:h-2" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
