/**
 * useGameEngine.ts
 *
 * The "Brain" of the board game. This hook owns the card-phase state machine,
 * the auto-submit-on-timeout logic, and the derived UI flags. The UI layer
 * (board/page.tsx) should consume this hook instead of duplicating the logic.
 *
 * Ground rules:
 * - No JSX / no visual code here.
 * - All socket/store side-effects stay in gameStore.ts.
 * - This hook only reads from the store and manages local UI state.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useGameStore,
  type QuestionCard,
  type Group,
} from "../../../store/gameStore";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CardPhase = "idle" | "drawing" | "revealed" | "returning";

export interface GameEngineState {
  /** Current phase of the card animation state machine. */
  cardPhase: CardPhase;

  /**
   * The card data that is "sticky" — it persists through the "returning"
   * animation so the card doesn't visually snap away before the exit anim ends.
   */
  stickyCardData: QuestionCard | null;

  /** The card to display (current or sticky). Null only when fully idle. */
  displayCard: QuestionCard | null;

  /** True when the card is anything other than "idle". */
  isCardActive: boolean;

  /** The subjective (essay/oral) answer text typed by the student. */
  tantanganText: string;
  setTantanganText: (v: string) => void;

  /**
   * True after the student submits a subjective answer and while waiting for
   * teacher grading. Guards against duplicate submissions.
   */
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;

  /** True when this group's answer is pending teacher review. */
  isUnderReview: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameEngine(role: string): GameEngineState {
  const {
    currentCard,
    isMoving,
    timer,
    pendingReviews,
    lastResult,
    activeGroupIndex,
    groups,
    myGroupName,
    submitAnswerObjektif,
    submitAnswerSubjektif,
  } = useGameStore();

  const activeGroup: Group | undefined = groups[activeGroupIndex];
  const myGroup = groups.find((g) => g.name === myGroupName);

  // ── Local state ────────────────────────────────────────────────────────────

  const [stickyCardData, setStickyCardData] = useState<QuestionCard | null>(null);
  const [cardPhase, setCardPhase] = useState<CardPhase>("idle");
  const [tantanganText, setTantanganText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref mirror for cardPhase — prevents stale closures inside timer callbacks.
  const cardPhaseRef = useRef<CardPhase>("idle");

  const updatePhase = useCallback((phase: CardPhase) => {
    cardPhaseRef.current = phase;
    setCardPhase(phase);
  }, []);

  // ── Timer refs ─────────────────────────────────────────────────────────────

  const syncTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const settleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const drawTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const returnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllCardTimers = useCallback(() => {
    [syncTimerRef, settleTimerRef, drawTimerRef, revealTimerRef, returnTimerRef].forEach((ref) => {
      if (ref.current) { clearTimeout(ref.current); ref.current = null; }
    });
  }, []);

  // ── Derived flag ───────────────────────────────────────────────────────────

  const isUnderReview =
    (role === "guru"
      ? pendingReviews.length > 0
      : pendingReviews.some(
          (r) => r.groupId === activeGroup?.id || r.groupId === myGroup?.id
        )) || isSubmitting;

  // ── State Machine ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Defer sticky sync to avoid synchronous setState warning
    if (currentCard && currentCard !== stickyCardData) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => setStickyCardData(currentCard), 0);
    }

    if (currentCard && !isMoving) {
      // Cancel any pending return animation
      if (returnTimerRef.current) { clearTimeout(returnTimerRef.current); returnTimerRef.current = null; }

      if (cardPhaseRef.current === "idle" || cardPhaseRef.current === "returning") {
        // Clear previous settle/draw/reveal timers
        if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null; }
        if (drawTimerRef.current)   { clearTimeout(drawTimerRef.current);   drawTimerRef.current   = null; }
        if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }

        // Wait for pion to visually settle before showing the card
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null;
          if (cardPhaseRef.current === "idle" || cardPhaseRef.current === "returning") {
            updatePhase("drawing");
            revealTimerRef.current = setTimeout(() => {
              revealTimerRef.current = null;
              updatePhase("revealed");
            }, 550);
          }
        }, 350);
      }
    } else if (!currentCard && !isUnderReview) {
      // Card dismissed — start exit animation
      if (cardPhaseRef.current === "revealed" || cardPhaseRef.current === "drawing") {
        clearAllCardTimers();
        updatePhase("returning");
        returnTimerRef.current = setTimeout(() => {
          returnTimerRef.current = null;
          setStickyCardData(null);
          setTantanganText("");
          setIsSubmitting(false);
          updatePhase("idle");
        }, 800);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard, isMoving, isUnderReview]);

  // ── Auto-submit on timeout (student only) ──────────────────────────────────

  const lastTimeoutCardRef = useRef<string | null>(null);

  useEffect(() => {
    if (role !== "siswa") return;
    if (activeGroup?.name !== myGroupName) return;
    if (timer !== 0 || !currentCard) return;
    if (lastTimeoutCardRef.current === (currentCard.id ?? null)) return;

    lastTimeoutCardRef.current = currentCard.id ?? null;

    if (currentCard.type === "DASAR") {
      submitAnswerObjektif(activeGroup.id, "TIMEOUT");
    } else {
      setTimeout(() => setIsSubmitting(true), 0);
      const fallback =
        currentCard.type === "PEMAHAMAN"
          ? "Waktu habis, jawaban tulisan belum selesai."
          : "Waktu habis, siswa belum selesai menjawab lisan.";
      submitAnswerSubjektif(activeGroup.id, tantanganText.trim() || fallback);
      setTimeout(() => setTantanganText(""), 0);
    }
  }, [timer, role, activeGroup, myGroupName, currentCard, tantanganText, submitAnswerObjektif, submitAnswerSubjektif]);

  // ── Reset isSubmitting when review is resolved ─────────────────────────────

  useEffect(() => {
    if (!isSubmitting) return;
    const hasMyReview = pendingReviews.some(
      (r) => r.groupId === activeGroup?.id || r.groupId === myGroup?.id
    );
    const hasMyResult =
      lastResult?.groupName === myGroupName ||
      lastResult?.groupName === activeGroup?.name;
    if (hasMyReview || hasMyResult || !currentCard) {
      setTimeout(() => setIsSubmitting(false), 0);
    }
  }, [pendingReviews, lastResult, myGroupName, activeGroup, myGroup, isSubmitting, currentCard]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    cardPhase,
    stickyCardData,
    displayCard: currentCard ?? stickyCardData,
    isCardActive: cardPhase !== "idle",
    tantanganText,
    setTantanganText,
    isSubmitting,
    setIsSubmitting,
    isUnderReview,
  };
}
