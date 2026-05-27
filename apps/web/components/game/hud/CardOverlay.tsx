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

function CardBackFace({ type, className }: { type: string; className?: string }) {
  const accent =
    type === "DASAR"     ? { bg: "bg-[#2c49c5]", glow: "shadow-blue-500/20"   } :
    type === "TANTANGAN" ? { bg: "bg-red-500",    glow: "shadow-red-500/20"    } :
                           { bg: "bg-orange-500", glow: "shadow-orange-500/20" };

  return (
    <div className={`absolute inset-0 bg-[#0f172a] border-[6px] border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-2xl ${className ?? "rounded-[2.5rem]"}`}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
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

// ─── CardFrontFace ────────────────────────────────────────────────────────────

function CardFrontFace({
  cardType, displayCard, currentCard, isUnderReview,
  isTimerRunning, timer, role, activeGroup, myGroupName,
  tantanganText, setTantanganText, submitAnswerObjektif,
  submitAnswerSubjektif, gradeSubjektif, setIsSubmitting,
  isSubmitting, pendingReviews,
}: CardOverlayProps & { cardType: string }) {
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
    <div className="absolute inset-0 bg-white rounded-[2.5rem] flex flex-col p-8 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-2 border-slate-100">
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
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {isUnderReview ? (
            <div className="space-y-6">
              {pendingReviews.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center border-2 border-zinc-100 shadow-inner">
                    <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Sedang mengirim...</p>
                </div>
              )}
              {pendingReviews
                .filter((r) => r.groupId === activeGroup?.id || pendingReviews.length === 1)
                .slice(0, 1)
                .map((rev) => (
                  <div key={rev.id} className="space-y-6">
                    <div className="text-center mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">MENILAI JAWABAN</p>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Tim {rev.groupName}</h3>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 p-4 opacity-[0.03]"><ScrollText className="w-20 h-20" /></div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 text-center">ISI JAWABAN:</p>
                      <p className="text-xl font-bold text-slate-800 italic leading-relaxed text-center relative z-10">&ldquo;{rev.answer}&rdquo;</p>
                    </div>
                    {role === "guru" && currentCard?.answerKey && (
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Referensi Kunci Jawaban:</p>
                        <p className="text-sm font-bold text-blue-900 leading-tight">{currentCard.answerKey}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3">ISI KARTU</p>
              <p className="text-lg font-bold text-zinc-900 leading-snug mb-6">&ldquo;{displayCard?.text}&rdquo;</p>

              {role === "siswa" && activeGroup?.name === myGroupName && (
                <div className="mt-4 pt-4 border-t-2 border-zinc-100">
                  {currentCard?.type === "DASAR" && currentCard.options ? (
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentCard.options.filter((o) => o?.trim()).map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => submitAnswerObjektif(activeGroup.id, opt)}
                          className="w-full text-left px-5 py-3.5 rounded-xl border-2 border-zinc-900 bg-white text-base font-black text-zinc-900 hover:bg-zinc-50 hover:-translate-y-0.5 shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] active:translate-y-0 active:shadow-none transition-all"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (currentCard?.type === "PEMAHAMAN" || currentCard?.type === "TANTANGAN") ? (
                    <div className="space-y-3">
                      {isUnderReview ? (
                        <div className={`flex flex-col items-center justify-center py-10 ${accent.light} rounded-2xl border-2 border-dashed ${cardType === "TANTANGAN" ? "border-red-200" : "border-orange-200"} animate-pulse`}>
                          <div className={`w-12 h-12 ${cardType === "TANTANGAN" ? "bg-red-100" : "bg-orange-100"} rounded-full flex items-center justify-center mb-4`}>
                            <Rocket className={`w-6 h-6 ${accent.text} animate-bounce`} />
                          </div>
                          <p className={`${cardType === "TANTANGAN" ? "text-red-900" : "text-orange-900"} font-black text-center uppercase tracking-widest text-xs`}>Menunggu Penilaian Guru</p>
                          <p className={`${accent.text} opacity-60 font-bold text-[10px] mt-1 italic`}>Tugasmu sedang ditinjau...</p>
                        </div>
                      ) : (
                        <>
                          {currentCard?.type === "PEMAHAMAN" ? (
                            <textarea
                              autoFocus
                              className="w-full min-h-[100px] bg-white border-2 border-zinc-900 rounded-xl px-5 py-4 text-zinc-900 text-base font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/15 resize-none shadow-inner"
                              placeholder="Ketik jawabanmu..."
                              value={tantanganText}
                              onChange={(e) => setTantanganText(e.target.value)}
                            />
                          ) : (
                            <div className="py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center mb-2">
                              <p className="text-xs font-bold text-slate-500">Jawab pertanyaan di atas secara lisan, lalu klik tombol di bawah jika sudah selesai!</p>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setIsSubmitting(true);
                              submitAnswerSubjektif(
                                activeGroup.id,
                                currentCard.type === "TANTANGAN"
                                  ? "Siswa telah selesai menjawab lisan."
                                  : tantanganText,
                              );
                              setTantanganText("");
                            }}
                            disabled={currentCard.type === "PEMAHAMAN" && !tantanganText.trim()}
                            className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-black tracking-[0.2em] uppercase hover:bg-zinc-800 disabled:opacity-20 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]"
                          >
                            {currentCard.type === "TANTANGAN" ? "SAYA SUDAH SELESAI" : "KIRIM JAWABAN"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => submitAnswerObjektif(activeGroup.id, "SELESAI")}
                      className="w-full py-4 rounded-xl bg-zinc-900 text-white text-base font-black tracking-widest uppercase hover:bg-zinc-800 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] active:scale-95"
                    >
                      LANJUT
                    </button>
                  )}
                </div>
              )}

              {(role === "guru" || activeGroup?.name !== myGroupName) && (
                <div className="mt-4 bg-zinc-100 border-2 border-zinc-200 p-6 rounded-xl text-center">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">STATUS</p>
                  <p className="text-base font-black text-zinc-800">MENUNGGU TIM {activeGroup?.name ?? "..."}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grading Section */}
        {isUnderReview && (
          <div className="mt-6 pt-6 border-t-2 border-zinc-100">
            {role === "guru" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Berikan Penilaian Sekarang</span>
                </div>

                {activeReview && (
                  <div className="space-y-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Pertanyaan:</p>
                      <span className="text-[8px] font-black px-1.5 py-0.5 bg-orange-200 text-orange-700 rounded uppercase">Tim: {activeReview.groupName}</span>
                    </div>
                    <p className="text-sm font-bold text-orange-900 leading-tight">{activeReview.question ?? "Pertanyaan Tantangan"}</p>
                    <div className="pt-2 border-t border-orange-200">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Jawaban Siswa:</p>
                      <p className="text-lg font-black text-blue-900 italic leading-tight">&ldquo;{activeReview.answer ?? "Tidak ada jawaban"}&rdquo;</p>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <span className="text-[8px] font-black text-orange-300 uppercase">Max {activeReview.points ?? 10} PT</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Salah",   score: 0,                                          icon: <XCircle     className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />,    cls: "border-red-200 bg-red-50 hover:bg-red-100",         text: "text-red-700"     },
                    { label: `Sebagian (+${Math.floor((activeReview?.points ?? 10) / 2)})`, score: Math.floor((activeReview?.points ?? 10) / 2), icon: <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin-slow group-hover:animate-none" />, cls: "border-orange-200 bg-orange-50 hover:bg-orange-100", text: "text-orange-700" },
                    { label: `Tepat (+${activeReview?.points ?? 10})`,                     score: activeReview?.points ?? 10,                    icon: <CheckCircle2 className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />, cls: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700" },
                  ].map(({ label, score, icon, cls, text }) => (
                    <button
                      key={label}
                      disabled={isSubmitting || isGrading}
                      onClick={() => activeReview && handleGrade(activeReview.id, score)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all shadow-sm group disabled:opacity-50 disabled:grayscale ${cls}`}
                    >
                      {icon}
                      <span className={`font-black text-[10px] tracking-tight uppercase ${text}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[2rem] text-center shadow-xl shadow-indigo-500/5"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-20 animate-pulse" />
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-indigo-50 relative z-10">
                      <Disc3 className="w-8 h-8 text-indigo-500 animate-spin-slow" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">PROSES PENILAIAN</p>
                    <h4 className="text-xl font-black text-indigo-900 tracking-tight">Menunggu Guru Menilai...</h4>
                    <p className="text-xs font-medium text-indigo-600/70 mt-2 leading-relaxed">
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
  hidden:   { x: 0, y: 400, scale: 0.1, opacity: 0 },
  drawing:  { x: 0, y: 0,   scale: 1,   opacity: 1 },
  revealed: { x: 0, y: 0,   scale: 1,   opacity: 1 },
  returning:{ x: 0, y: 400, scale: 0.1, opacity: 0 },
};

export default function CardOverlay(props: CardOverlayProps) {
  const { phase, isUnderReview, displayCard } = props;
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const shouldFlip = phase === "revealed" || isUnderReview;
    const t = setTimeout(() => setIsFlipped(shouldFlip), shouldFlip ? 80 : 0);
    return () => clearTimeout(t);
  }, [phase, isUnderReview]);

  const isVisible   = phase !== "idle" || isUnderReview;
  const flipped     = (phase === "revealed" || isUnderReview) ? isFlipped : false;
  const cardType    = displayCard?.type ?? "DASAR";
  const posTarget   =
    isUnderReview      ? "revealed"  :
    phase === "returning"            ? "returning" :
    phase === "drawing" || phase === "revealed" ? "drawing" : "hidden";
  const posTransition =
    phase === "drawing"   ? { duration: 0.5, ease: [0.22, 1, 0.36, 1]  as [number,number,number,number] } :
    phase === "returning" ? { duration: 0.5, ease: [0.4, 0, 0.6, 1]    as [number,number,number,number], delay: 0.32 } :
    { duration: 0.3 };

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
            style={{ perspective: 1200, width: "min(360px, 92vw)", height: "min(520px, 82vh)" }}
            variants={POSITION_VARIANTS}
            initial="hidden"
            animate={posTarget}
            transition={posTransition}
          >
            <motion.div
              className="w-full h-full relative"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              {/* Back face */}
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                <CardBackFace type={cardType} className="rounded-[20px]" />
                <div className="absolute inset-0 pointer-events-none rounded-[20px]" style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
              </div>

              {/* Front face */}
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <CardFrontFace {...props} cardType={cardType} />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
