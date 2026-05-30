"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, AlertCircle, CheckCircle2,
  XCircle, ScrollText, Disc3, Loader2, Rocket,
} from "lucide-react";
import { useGameStore, type QuestionCard, type Group, type PendingReview } from "../../../store/gameStore";
import type { CardPhase } from "../engine/useGameEngine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CardOverlayProps {
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
  setIsSubmitting: (v: boolean) => void;
  isSubmitting: boolean;
  pendingReviews: PendingReview[];
}

// ─── Accent helper ───────────────────────────────────────────────────────────

function getAccent(cardType: string, isUnderReview: boolean) {
  if (isUnderReview) {
    return cardType === "TANTANGAN"
      ? { bg: "bg-red-600",    text: "text-red-600",    light: "bg-red-50"    }
      : { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50" };
  }
  if (cardType === "DASAR")     return { bg: "bg-[#2c49c5]",  text: "text-[#2c49c5]",  light: "bg-blue-50"   };
  if (cardType === "TANTANGAN") return { bg: "bg-red-600",    text: "text-red-600",    light: "bg-red-50"    };
  return                               { bg: "bg-orange-600", text: "text-orange-600", light: "bg-orange-50" };
}

// ─── CardBackFace ─────────────────────────────────────────────────────────────

function CardBackFace({ type, className, isMobile }: { type: string; className?: string; isMobile?: boolean }) {
  const accent =
    type === "DASAR"     ? { bg: "bg-[#2c49c5]", glow: "shadow-blue-500/20"   } :
    type === "TANTANGAN" ? { bg: "bg-red-500",    glow: "shadow-red-500/20"    } :
                           { bg: "bg-orange-500", glow: "shadow-orange-500/20" };

  return (
    <div className={`absolute inset-0 bg-[#0f172a] border-[6px] border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-2xl ${className ?? "rounded-[2.5rem]"}`}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div className={`absolute w-64 h-64 rounded-full blur-[80px] opacity-20 ${accent.bg}`} />
      <div className={`relative z-10 w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner ${isMobile ? "" : "backdrop-blur-sm"}`}>
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

// ─── CardFrontFace ────────────────────────────────────────────────────────────

function CardFrontFace({
  cardType, displayCard, currentCard, isUnderReview,
  isTimerRunning, timer, role, activeGroup, myGroupName,
  tantanganText, setTantanganText, submitAnswerObjektif,
  submitAnswerSubjektif, gradeSubjektif, setIsSubmitting,
  isSubmitting, pendingReviews, isMobile,
}: CardOverlayProps & { cardType: string; isMobile: boolean }) {
  const { isGrading } = useGameStore();
  const accent = getAccent(cardType, isUnderReview);
  const review = pendingReviews.find((r) => r.groupId === activeGroup?.id) ?? pendingReviews[0];
  const lastReviewId = useRef(review?.id);

  useEffect(() => {
    if (review?.id !== lastReviewId.current) {
      setIsSubmitting(false);
      lastReviewId.current = review?.id;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.id]);

  const handleGrade = (id: string, score: number) => {
    if (isSubmitting || isGrading) return;
    setIsSubmitting(true);
    gradeSubjektif(id, score);
  };

  const activeReview = pendingReviews.find((r) => r.groupId === activeGroup?.id) ?? pendingReviews[0];

  return (
    <div className="absolute inset-0 bg-white rounded-[2.5rem] flex flex-col p-5 md:p-8 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-2 border-slate-100">
      {/* Corner Accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${accent.bg} opacity-10`} style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />

      {/* Header */}
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
          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 border-white shadow-lg ${timer <= 5 ? "bg-red-500 text-white animate-pulse" : "bg-slate-900 text-white"}`}>
            <span className="text-xl font-black font-mono leading-none">{timer}</span>
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Sec</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 pr-1 pb-6">
          {isUnderReview ? (
            <div className="space-y-3 md:space-y-4">
              {pendingReviews.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100 shadow-inner">
                    <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
                  </div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Sedang mengirim...</p>
                </div>
              )}
              {pendingReviews
                .filter((r) => r.groupId === activeGroup?.id || pendingReviews.length === 1)
                .slice(0, 1)
                .map((rev) => (
                  <div key={rev.id} className="space-y-3 md:space-y-4">
                    <div className="text-center mb-1 md:mb-2">
                      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-0.5 md:mb-1">MENILAI JAWABAN</p>
                      <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight">Tim {rev.groupName}</h3>
                    </div>

                    {/* Pertanyaan */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pertanyaan:</p>
                      <p className="text-xs md:text-sm font-bold text-slate-800 leading-tight">{rev.question || displayCard?.text}</p>
                    </div>

                    {/* Isi Jawaban Siswa */}
                    <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl text-left relative overflow-hidden">
                      <p className="text-[7px] md:text-[8px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Jawaban Siswa:</p>
                      <p className="text-sm md:text-base font-bold text-slate-800 italic leading-relaxed relative z-10">&ldquo;{rev.answer}&rdquo;</p>
                      <div className="mt-1 flex justify-end">
                        <span className="text-[7px] font-black text-orange-400 uppercase">Maks {rev.points || 10} Poin</span>
                      </div>
                    </div>

                    {/* Referensi Kunci Jawaban (Khusus Guru) */}
                    {role === "guru" && displayCard?.answerKey && (
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-left">
                        <p className="text-[7px] md:text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Referensi Kunci Jawaban:</p>
                        <p className="text-xs md:text-sm font-bold text-blue-900 leading-tight">{displayCard.answerKey}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">ISI KARTU</p>
              <p className="text-base md:text-lg font-bold text-zinc-900 leading-snug mb-4 md:mb-6">&ldquo;{displayCard?.text}&rdquo;</p>

              {role === "siswa" && activeGroup?.name === myGroupName && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  {displayCard?.type === "DASAR" && displayCard.options ? (
                    <div className="grid grid-cols-1 gap-2 mb-2 md:mb-4">
                      {displayCard.options.filter((o) => o?.trim()).map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => submitAnswerObjektif(activeGroup.id, opt)}
                          className="w-full text-left px-4 md:px-5 py-2.5 md:py-3.5 rounded-xl border-2 border-zinc-900 bg-white text-xs md:text-base font-black text-zinc-900 hover:bg-zinc-50 hover:-translate-y-0.5 shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] active:translate-y-0 active:shadow-none transition-all"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (displayCard?.type === "PEMAHAMAN" || displayCard?.type === "TANTANGAN") ? (
                    <div className="space-y-2 md:space-y-3">
                      {isUnderReview ? (
                        <div className={`flex flex-col items-center justify-center py-6 md:py-10 ${accent.light} rounded-2xl border-2 border-dashed ${cardType === "TANTANGAN" ? "border-red-200" : "border-orange-200"} animate-pulse`}>
                          <div className={`w-10 h-10 ${cardType === "TANTANGAN" ? "bg-red-100" : "bg-orange-100"} rounded-full flex items-center justify-center mb-2 md:mb-4`}>
                            <Rocket className={`w-5 h-5 ${accent.text} animate-bounce`} />
                          </div>
                          <p className={`${cardType === "TANTANGAN" ? "text-red-900" : "text-orange-900"} font-black text-center uppercase tracking-widest text-[10px] md:text-xs`}>Menunggu Penilaian Guru</p>
                          <p className={`${accent.text} opacity-60 font-bold text-[9px] md:text-[10px] mt-0.5 md:mt-1 italic`}>Tugasmu sedang ditinjau...</p>
                        </div>
                      ) : (
                        <>
                          {displayCard?.type === "PEMAHAMAN" ? (
                            <textarea
                              className="w-full min-h-[80px] md:min-h-[100px] bg-white border-2 border-zinc-900 rounded-xl px-4 md:px-5 py-3 md:py-4 text-zinc-900 text-sm md:text-base font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/15 resize-none shadow-inner"
                              placeholder="Ketik jawabanmu..."
                              value={tantanganText}
                              onChange={(e) => setTantanganText(e.target.value)}
                            />
                          ) : (
                            <div className="py-4 md:py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center mb-1 md:mb-2">
                              <p className="text-[11px] md:text-xs font-bold text-slate-500">Jawab pertanyaan di atas secara lisan, lalu klik tombol di bawah jika sudah selesai!</p>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setIsSubmitting(true);
                              submitAnswerSubjektif(
                                activeGroup.id,
                                displayCard.type === "TANTANGAN"
                                  ? "Siswa telah selesai menjawab lisan."
                                  : tantanganText,
                              );
                              setTantanganText("");
                            }}
                            disabled={displayCard.type === "PEMAHAMAN" && !tantanganText.trim()}
                            className="w-full py-2.5 md:py-3.5 mb-2 md:mb-4 rounded-xl bg-zinc-900 text-white font-black text-xs md:text-sm tracking-[0.15em] md:tracking-[0.2em] uppercase hover:bg-zinc-800 disabled:opacity-20 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]"
                          >
                            {displayCard.type === "TANTANGAN" ? "SAYA SUDAH SELESAI" : "KIRIM JAWABAN"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => submitAnswerObjektif(activeGroup.id, "SELESAI")}
                      className="w-full py-2.5 md:py-4 mb-2 md:mb-4 rounded-xl bg-zinc-900 text-white text-xs md:text-base font-black tracking-widest uppercase hover:bg-zinc-800 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] active:scale-95"
                    >
                      LANJUT
                    </button>
                  )}
                </div>
              )}

              {(role === "guru" || activeGroup?.name !== myGroupName) && (
                <div className="mt-3 bg-zinc-100 border border-zinc-200 p-4 rounded-xl text-center">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">STATUS</p>
                  <p className="text-sm font-black text-zinc-800">MENUNGGU TIM {activeGroup?.name ?? "..."}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grading Section */}
        {isUnderReview && (
          <div className="mt-3 md:mt-6 pt-3 md:pt-6 border-t border-zinc-100">
            {role === "guru" ? (
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-1.5 text-orange-600 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Berikan Penilaian Sekarang</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Salah",   score: 0,                                          icon: <XCircle     className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />,    cls: "border-red-200 bg-red-50 hover:bg-red-100",         text: "text-red-700"     },
                    { label: `Sebagian (+${Math.floor((activeReview?.points ?? 10) / 2)})`, score: Math.floor((activeReview?.points ?? 10) / 2), icon: <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin-slow group-hover:animate-none" />, cls: "border-orange-200 bg-orange-50 hover:bg-orange-100", text: "text-orange-700" },
                    { label: `Tepat (+${activeReview?.points ?? 10})`,                     score: activeReview?.points ?? 10,                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />, cls: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700" },
                  ].map(({ label, score, icon, cls, text }) => (
                    <button
                      key={label}
                      disabled={isSubmitting || isGrading}
                      onClick={() => activeReview && handleGrade(activeReview.id, score)}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-2 transition-all shadow-sm group disabled:opacity-50 disabled:grayscale ${cls}`}
                    >
                      {icon}
                      <span className={`font-black text-[8px] md:text-[9px] tracking-tighter md:tracking-tight uppercase ${text}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                animate={isMobile ? {} : { scale: [1, 1.02, 1] }}
                transition={isMobile ? {} : { duration: 2, repeat: Infinity }}
                className="bg-indigo-50 border border-indigo-100 p-4 md:p-6 rounded-2xl text-center shadow-md shadow-indigo-500/5"
              >
                <div className="flex flex-col items-center gap-2 md:gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-400 rounded-full blur-lg opacity-20 animate-pulse" />
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow border border-indigo-50 relative z-10">
                      <Disc3 className="w-5 h-5 text-indigo-500 animate-spin-slow" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.25em] mb-1">PROSES PENILAIAN</p>
                    <h4 className="text-base font-black text-indigo-900 tracking-tight">Menunggu Guru Menilai...</h4>
                    <p className="text-[10px] font-medium text-indigo-600/70 mt-1 leading-relaxed">
                      Jawaban tim kamu sudah terkirim.<br />Jangan tutup halaman ini ya!
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

// ─── CardOverlay ─────────────────────────────────────────────────────────────

const POSITION_VARIANTS = {
  hidden:   { y: 60, opacity: 0 },
  drawing:  { y: 0,  opacity: 1 },
  revealed: { y: 0,  opacity: 1 },
  returning:{ y: 60, opacity: 0 },
};

export default function CardOverlay(props: CardOverlayProps) {
  const { phase, isUnderReview, displayCard } = props;
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const animatingPionId = useGameStore(state => state.animatingPionId);
  const isPionMoving = animatingPionId === props.activeGroup?.id;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const shouldFlip = phase === "revealed" || isUnderReview;
    const t = setTimeout(() => setIsFlipped(shouldFlip), shouldFlip ? 80 : 0);
    return () => clearTimeout(t);
  }, [phase, isUnderReview]);

  const isVisible   = (phase !== "idle" || isUnderReview);
  const flipped     = (phase === "revealed" || isUnderReview) ? isFlipped : false;
  const cardType    = displayCard?.type ?? "DASAR";
  const posTarget   =
    isUnderReview      ? "revealed"  :
    phase === "returning"            ? "returning" :
    phase === "drawing" || phase === "revealed" ? "drawing" : "hidden";
  const posTransition =
    phase === "drawing"   ? { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } :
    phase === "returning" ? { duration: 0.35, ease: [0.4, 0, 0.6, 1] as [number,number,number,number], delay: 0.25 } :
    { duration: 0.25 };

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
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "returning" ? 0 : 0.4 }}
            transition={{ duration: 0.3 }}
          />

          {/* Card Container */}
          <motion.div
            className="relative z-10"
            style={{ perspective: isMobile ? undefined : 1200, width: "min(320px, 88vw)", height: "min(470px, 78vh)" }}
            variants={POSITION_VARIANTS}
            initial="hidden"
            animate={posTarget}
            transition={posTransition}
          >
            <motion.div
              className="w-full h-full relative"
              style={isMobile ? { willChange: "transform, opacity" } : { transformStyle: "preserve-3d", willChange: "transform" }}
              animate={isMobile ? { scale: flipped ? [0.96, 1.02, 1] : 1 } : { rotateY: flipped ? 180 : 0 }}
              transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number,number,number,number] }}
            >
              {isMobile ? (
                /* On Mobile: Conditional rendering to completely avoid 3D preserve-3d performance cost */
                <div className="absolute inset-0">
                  {flipped ? (
                    <CardFrontFace {...props} cardType={cardType} isMobile={isMobile} />
                  ) : (
                    <>
                      <CardBackFace type={cardType} className="rounded-[20px]" isMobile={isMobile} />
                      <div className="absolute inset-0 pointer-events-none rounded-[20px]" style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
                    </>
                  )}
                </div>
              ) : (
                /* On Desktop: Keep premium 3D flip card animation */
                <>
                  {/* Back face */}
                  <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                    <CardBackFace type={cardType} className="rounded-[20px]" isMobile={isMobile} />
                    <div className="absolute inset-0 pointer-events-none rounded-[20px]" style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
                  </div>

                  {/* Front face */}
                  <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <CardFrontFace {...props} cardType={cardType} isMobile={isMobile} />
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
