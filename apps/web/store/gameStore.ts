import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { createClient } from '../lib/supabase/client';

// Primitive game types — defined in types/game.ts to avoid circular dependencies.
export type { GroupStatus, GameStatus, QuestionType } from '../types/game';
import type { GroupStatus, GameStatus, QuestionType } from '../types/game';

export interface Group {
  id: string;
  name: string;
  score: number;
  position: number;
  status: GroupStatus;
  avatar?: string;
  color?: string;
  isOffline?: boolean;
}

export interface QuestionSet {
  id: string;
  title: string;
  description: string | null;
  isPreset: boolean;
  guruId: string | null;
  createdAt: string;
  questions?: QuestionCard[];
  _count?: {
    questions: number;
  };
}

export interface QuestionCard {
  id?: string;
  setId?: string;
  type: QuestionType;
  text: string;
  points: number;
  options?: string[];
  answerKey?: string;
}

export interface RoomConfig {
  gameDurationSec: number;
  turnDurationDasar: number;
  turnDurationTantangan: number;
  turnDurationPemahaman: number;
  maxGroups: number;
  questionSetId?: string;
}

export interface PendingReview {
  id: string;
  groupId: string;
  groupName: string;
  question: string;
  answer: string;
  points: number;
  dbAnswerId?: string;
  answerKey?: string | null;
}

export interface SessionHistory {
  id: string;
  date: string;
  roomCode: string;
  winner: string;
  winnerScore: number;
  totalGroups: number;
  leaderboard: Group[];
}

export interface AnswerResult {
  type: 'SUCCESS' | 'FAILURE' | 'INFO';
  title: string;
  message: string;
  points: number;
  groupName: string;
  turnNumber?: number;
}

interface GameState {
  gameStatus: GameStatus;
  roomCode: string;
  roomConfig: RoomConfig;
  groups: Group[];
  activeGroupIndex: number;
  currentTurn: number;
  timer: number;
  globalTimer: number;
  isTimerRunning: boolean;
  isGlobalTimerRunning: boolean;
  currentCard: QuestionCard | null;
  diceValue: number;
  isRolling: boolean;
  isMoving: boolean;
  hasRolled: boolean;
  
  questionSets: QuestionSet[];
  activeQuestionSet: QuestionSet | null;
  questions: QuestionCard[];
  pagination: {
    sets: { page: number; totalPages: number; total: number };
    questions: { page: number; totalPages: number; total: number };
  };
  pendingReviews: PendingReview[];
   sessionHistory: SessionHistory[];
   isLoadingQuestions: boolean;
   isLoadingSets: boolean;
  
  winner: Group | null;
  logs: string[];
  isGuru: boolean;
  myGroupName: string | null;
  myAvatar?: string;
  myColor?: string;
  lastResult: AnswerResult | null;
  lastClosedResultTurn: number | null;
  isMuted: boolean;
  countdown: number | null;
  activeTab: 'SESI' | 'SOAL' | 'RIWAYAT';
  selectedSession: any | null;
  isGrading: boolean;
  // Branching path state
  stepsRemaining: number;
  isChoosingPath: boolean;
  availablePaths: number[];
  // Star Spin State
  isSpinningStar: boolean;
  starSpinResult: string | null;
  isSpinAnimating: boolean;
  lastLocalMoveTime: number;
  lastCardDrawTime: number;
  lastProfileUpdateTime: number;
  lastBranchChoiceTime: number;
  isSuperseded: boolean;
  animatingPionId: string | null;
  lastCardDismissTime: number;
  lastSpinCloseTime: number;
  lastResultCloseTime: number;
  stateSeq: number;
  visualPath: number[];
}

interface GameActions {
  toggleMute: () => void;
  setCountdown: (val: number | null) => void;
  createRoom: (config: RoomConfig) => Promise<void>;
  joinRoom: (roomCode: string, name: string, avatar?: string, color?: string) => void;
  startGame: () => void;
  endGame: () => void;
  resetToIdle: () => void;
  rejoinAsGuru: (roomCode: string) => Promise<void>;
  setActiveTab: (tab: 'SESI' | 'SOAL' | 'RIWAYAT') => void;
  setSelectedSession: (session: any | null) => void;

  // Actions - Paket Soal
  fetchQuestionSets: (page?: number, showSkeleton?: boolean) => Promise<void>;
  createQuestionSet: (title: string, description?: string) => Promise<QuestionSet>;
  updateQuestionSet: (id: string, title: string, description?: string) => Promise<QuestionSet>;
  deleteQuestionSet: (id: string) => Promise<void>;
  duplicatePreset: (id: string) => Promise<QuestionSet>;
  importQuestions: (setId: string, questions: Omit<QuestionCard, 'id' | 'setId'>[]) => Promise<void>;
  setActiveQuestionSet: (questionSet: QuestionSet | null) => void;

  // Actions - Pertanyaan
  addQuestion: (setId: string, q: Omit<QuestionCard, 'id' | 'setId'>) => Promise<void>;
  updateQuestion: (id: string, q: Partial<QuestionCard>) => Promise<void>;
  deleteQuestion: (id: string, type?: string, search?: string) => Promise<void>;
  fetchQuestions: (setId: string, page?: number, showSkeleton?: boolean, limit?: number, type?: string, search?: string) => Promise<void>;

  // Actions - Mekanik Permainan
  drawCard: (type?: QuestionType) => void;
  rollDice: () => void;
  selectBranch: (nextTileId: number) => void;
  submitAnswerObjektif: (groupId: string, answer: string) => void;
  submitAnswerSubjektif: (groupId: string, answerText: string) => void;
  reviewSubmission: (reviewId: string, score: number) => void;
  gradeSubjektif: (reviewId: string, score: number) => void; // alias for reviewSubmission (used in board/page.tsx)
  nextTurn: () => void;
  clearLastResult: () => void;
  
  updateGroups: (groups: Group[]) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  leaveRoom: (roomCode: string, name: string) => void;
  cancelRoom: (roomCode: string) => void;
  
  spinStar: () => void;
  
  // Sync
  setStateFromSync: (state: Partial<GameState>) => void;
  handleAutoRejoin: () => void;
  reactivateSession: () => void;
  exitToLobby: () => void;
  setAnimatingPionId: (id: string | null) => void;
  onPionAnimationFinished: () => void;
  checkActiveSession: () => Promise<void>;
}



export let socket: Socket | null = null;
if (typeof window !== 'undefined') {
  socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');
}

let resultTimeoutId: NodeJS.Timeout | null = null;
// Use sessionStorage to track intent across refreshes (unique per tab)
const getLeavingFlag = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('eduboard_leaving') === 'true';
};
const setLeavingFlag = (val: boolean) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('eduboard_leaving', val ? 'true' : 'false');
  }
};
let isJoining = false;

// Tile graph helpers — single source of truth is gameConfig.ts
import { getTileTypeAt, getTileById } from '../components/game/config/gameConfig';
export { getTileTypeAt };

// Helper to calculate the visual sub-path up to the next fork or end destination
export function calculateSubPath(fromTileId: number, steps: number): { path: number[], stepsRemaining: number } {
  const path: number[] = [];
  let currentId = fromTileId;
  let remaining = steps;

  while (remaining > 0) {
    const currentTile = getTileById(currentId);
    const nextIds = currentTile.next;

    if (!nextIds || nextIds.length === 0) {
      break;
    }

    if (nextIds.length > 1) {
      // Current tile is a fork. We must stop here and ask the player to choose.
      break;
    }

    // Move 1 step
    const nextId = nextIds[0];
    path.push(nextId);
    currentId = nextId;
    remaining--;

    // If the newly reached tile is a fork, stop here if we have steps remaining
    const nextTile = getTileById(currentId);
    if (nextTile.next && nextTile.next.length > 1 && remaining > 0) {
      break;
    }
  }

  return { path, stepsRemaining: remaining };
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => {
      const syncSet = (partialOrFn: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => {
        set((state) => {
          const nextPartial = typeof partialOrFn === 'function' ? partialOrFn(state) : partialOrFn;
          
          const newSeq = (state.stateSeq || 0) + 1;
          const mergedPartial = { ...nextPartial, stateSeq: newSeq };

          if (socket && state.roomCode && state.gameStatus !== 'IDLE') {
            socket.emit("game:sync_state", { 
              roomCode: mergedPartial.roomCode || state.roomCode, 
              state: mergedPartial 
            });
          }
          return { ...state, ...mergedPartial };
        });
      };

      if (socket) {
        // IMPORTANT: We REMOVED the global socket.on("connect", handleAutoRejoin) here.
        // Doing so prevents the "Double Join" bug where both the store init and 
        // the rehydration process try to rejoin at the same time.
        // 
        // Instead, handleAutoRejoin will only be called by onRehydrateStorage 
        // to ensure we have the correct data before joining.

        socket.on("game:state", (newState: Partial<GameState>) => {
          const currentState = get();
          
          const currentRoomCode = currentState.roomCode;
          const incomingRoomCode = (newState as any).roomCode || newState.roomCode;

          // Accept state only if:
          // 1. We have a local roomCode AND it matches the incoming one, OR
          // 2. Local roomCode is empty but incoming roomCode exists (just rejoined)
          const isRoomMismatch = incomingRoomCode && currentRoomCode && currentRoomCode !== incomingRoomCode;
          if (isRoomMismatch) {
            return;
          }
          if (!incomingRoomCode && !currentRoomCode) {
            return;
          }

          // PILAR B: Sequence-Numbered Filter
          if (newState.stateSeq !== undefined && currentState.stateSeq !== undefined) {
            if (newState.stateSeq < currentState.stateSeq) {
              // ALWAYS accept FINISHED game status, do not discard it!
              if (newState.gameStatus !== 'FINISHED') {
                return;
              }
            }
          }

          if (newState.lastResult === null && resultTimeoutId) {
            clearTimeout(resultTimeoutId);
            resultTimeoutId = null;
          }

          // Merge server state but preserve client-only identity fields
          set((state) => {
            // Priority: current state → server state → localStorage fallback
            let finalLastResult = newState.lastResult;
            if (finalLastResult && finalLastResult.turnNumber === state.lastClosedResultTurn) {
              finalLastResult = null;
            }

            let finalGroupName = state.myGroupName;
            if (!finalGroupName) {
              // Try to recover from sessionStorage directly as last resort
              try {
                const persisted = sessionStorage.getItem('eduboard-storage');
                if (persisted) {
                  const parsed = JSON.parse(persisted);
                  finalGroupName = parsed?.state?.myGroupName || null;
                }
              } catch {}
            }
            
            const finalRoomCode = state.roomCode || incomingRoomCode || '';
            
            // AUTO-RECOVER GURU STATUS:
            let isGuru = state.isGuru;
            if (!isGuru && finalRoomCode && typeof window !== 'undefined') {
              const key = `eduboard_role_${finalRoomCode}`;
              const backupRole = localStorage.getItem(key);
              if (backupRole === 'guru') {
                isGuru = true;
                const setId = (newState.roomConfig as any)?.questionSetId;
                if (setId) {
                  setTimeout(() => get().fetchQuestions(setId), 500);
                }
              }
            }

            // Cari grup secara case-insensitive agar toleran terhadap perbedaan huruf kapital saat rejoin.
            const myGroup = newState.groups?.find(
              g => g.name.trim().toLowerCase() === finalGroupName?.trim().toLowerCase()
            );

            // Koreksi huruf kapital nama kelompok lokal agar 100% sama dengan data resmi server
            if (myGroup && finalGroupName !== myGroup.name) {
              finalGroupName = myGroup.name;
            }
            
            // PROTECT QUESTIONS: Don't overwrite existing questions with an empty array from server
            const finalQuestions = (newState.questions && newState.questions.length > 0) 
              ? newState.questions 
              : state.questions;

            let finalGroups = newState.groups;
            if (finalGroups) {
              finalGroups = [...finalGroups].sort((a, b) => a.id.localeCompare(b.id));
            }

            const finalMyAvatar = myGroup ? (myGroup.avatar || state.myAvatar) : state.myAvatar;
            const finalMyColor = myGroup ? (myGroup.color || state.myColor) : state.myColor;

            // Reset client-side gameplay/turn states to clean defaults when game starts or resets to LOBBY
            // Only reset once: when transitioning from non-PLAYING → PLAYING (LOBBY→game start).
            // Do NOT add `newState.currentTurn === 1` here — it fires on EVERY broadcast during
            // turn 1, resetting isRolling/currentCard/isSpinningStar mid-animation.
            // The joinRoom() call already clears these states when a player (re)joins.
            const isGameStarting = newState.gameStatus === 'PLAYING' && state.gameStatus !== 'PLAYING';
            const isResetting = newState.gameStatus === 'LOBBY' && state.gameStatus !== 'LOBBY';
            const localReset = (isGameStarting || isResetting) ? {
              hasRolled: false,
              isRolling: false,
              isMoving: false,
              currentCard: null,
              isUnderReview: false,
              timer: 0,
              isTimerRunning: false,
              visualPath: [],
              isChoosingPath: false,
              availablePaths: [],
              stepsRemaining: 0,
              isSpinningStar: false,
              starSpinResult: null,
              isSpinAnimating: false
            } : {};

            return {
              ...state,
              ...newState,
              isSuperseded: false,
              ...(finalGroups ? { groups: finalGroups } : {}),
              questions: finalQuestions,
              isGuru,
              myGroupName: finalGroupName, 
              roomCode: finalRoomCode,
              myAvatar: finalMyAvatar,
              myColor: finalMyColor,
              ...localReset,
              ...(finalLastResult !== undefined ? { lastResult: finalLastResult } : {}),
              ...(newState.gameStatus === 'FINISHED' ? { currentCard: null, pendingReviews: [] } : {})
            };
          });
        });
        
        socket.on("game:timer_sync", (data: { timer: number, globalTimer: number, countdown: number | null }) => {
            const state = get();
            if (!state.roomCode || state.gameStatus === 'IDLE') return;
            
            const isFinishing = data.globalTimer <= 0 && state.gameStatus === 'PLAYING';
            set({ 
              timer: data.timer, 
              globalTimer: data.globalTimer, 
              countdown: data.countdown,
              ...(isFinishing ? { gameStatus: 'FINISHED', isGlobalTimerRunning: false, isTimerRunning: false, currentCard: null, pendingReviews: [] } : {})
            });
        });

        socket.on("room:full", (data: { message: string }) => {
          set({ myGroupName: null, roomCode: '', gameStatus: 'IDLE' });
          toast.error(data.message || "Ruangan sudah penuh!");
        });

        socket.on("error", (data: any) => {
          set({ myGroupName: null, roomCode: '', gameStatus: 'IDLE' });
          const errMsg = typeof data === 'string' 
            ? data 
            : (data && data.message) 
              ? data.message 
              : "Terjadi kesalahan!";
          toast.error(errMsg);
        });

        socket.on("room:superseded", () => {
          set({ isSuperseded: true });
        });
 
        socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
          toast.error("Koneksi real-time terputus/gagal. Pastikan jaringan internet Anda stabil atau tidak diblokir.");
        });
      }

      return {
        isGuru: false,
        gameStatus: 'IDLE',
        roomCode: '',
        roomConfig: { 
          gameDurationSec: 600, 
          turnDurationDasar: 30, 
          turnDurationTantangan: 60, 
          turnDurationPemahaman: 90, 
          maxGroups: 4
        },
        groups: [],
        activeGroupIndex: 0,
        currentTurn: 1,
        timer: 0,
        globalTimer: 0,
        isTimerRunning: false,
        isGlobalTimerRunning: false,
        currentCard: null,
        diceValue: 1,
        isRolling: false,
        isMoving: false,
        hasRolled: false,
        questionSets: [],
        activeQuestionSet: null,
        questions: [],
        pagination: {
          sets: { page: 1, totalPages: 1, total: 0 },
          questions: { page: 1, totalPages: 1, total: 0 },
        },
        pendingReviews: [],
        sessionHistory: [],
        isLoadingQuestions: false,
        isLoadingSets: false,
        winner: null,
        logs: [],
        myGroupName: null,
        myAvatar: undefined,
        myColor: undefined,
        lastResult: null,
        lastClosedResultTurn: null,
        isMuted: false,
        countdown: null,
        activeTab: 'SESI',
        selectedSession: null,
        isGrading: false,
        stepsRemaining: 0,
        isChoosingPath: false,
        availablePaths: [],
        isSpinningStar: false,
        starSpinResult: null,
        isSpinAnimating: false,
        lastLocalMoveTime: 0,
        lastCardDrawTime: 0,
        lastProfileUpdateTime: 0,
        lastBranchChoiceTime: 0,
        isSuperseded: false,
        animatingPionId: null,
        lastCardDismissTime: 0,
        lastSpinCloseTime: 0,
        lastResultCloseTime: 0,
        stateSeq: 0,
        visualPath: [],

        toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
        setAnimatingPionId: (id) => set({ animatingPionId: id }),
        setCountdown: (val) => syncSet({ countdown: val }),
        updateGroups: (groups) => syncSet({ groups: [...groups].sort((a, b) => a.id.localeCompare(b.id)) }),
        updateGroup: (groupId, updates) => syncSet((state) => {
          const isMyGroup = state.myGroupName && state.groups.find(g => g.id === groupId)?.name?.trim().toLowerCase() === state.myGroupName?.trim().toLowerCase();
          return {
            groups: state.groups.map(g => g.id === groupId ? { ...g, ...updates } : g),
            ...(isMyGroup ? {
              lastProfileUpdateTime: Date.now(),
              ...(updates.avatar ? { myAvatar: updates.avatar } : {}),
              ...(updates.color ? { myColor: updates.color } : {})
            } : {})
          };
        }),
        leaveRoom: (roomCode, name) => {
          setLeavingFlag(true); 
          if (socket) {
            socket.emit("room:leave", { roomCode, groupName: name });
          }
          get().resetToIdle();
        },
         cancelRoom: (roomCode) => {
          setLeavingFlag(true); // Set flag BEFORE emitting
          if (socket) {
            socket.emit("room:cancel", roomCode);
          }
          get().resetToIdle();
        },
        spinStar: () => {
          const state = get();
          const activeG = state.groups[state.activeGroupIndex];
          if (!activeG) return;

          // Only the active student whose turn it is can trigger the spin. Guru cannot spin.
          const isMyTurn = !state.isGuru && activeG.name?.trim().toLowerCase() === state.myGroupName?.trim().toLowerCase();
          if (!isMyTurn) return;

          if (socket && state.roomCode) {
            socket.emit("game:spin_star", state.roomCode);
          }
        },
        setStateFromSync: (newState) => set(newState),


        createRoom: async (config) => {
          const toastId = toast.loading("Sedang menyiapkan ruangan permainan...");
          try {
            const room = await api.post("/api/rooms", {
              durationMinutes: config.gameDurationSec / 60,
              turnDurationDasar: config.turnDurationDasar,
              turnDurationTantangan: config.turnDurationTantangan,
              turnDurationPemahaman: config.turnDurationPemahaman,
              maxGroups: config.maxGroups,
              questionSetId: config.questionSetId
            });
            const newCode = room.code;
            toast.dismiss(toastId);
            toast.success(`Ruangan berhasil dibuat! Kode: ${newCode}`);
            set({
              gameStatus: 'LOBBY',
              roomCode: newCode,
              isGuru: true,
              roomConfig: config,
              groups: [], // CLEAR old groups
              pendingReviews: [], // CLEAR old reviews
              isGrading: false,
              winner: null,
              currentCard: null,
              timer: 0,
              globalTimer: 0,
              isTimerRunning: false,
              isGlobalTimerRunning: false,
              lastResult: null,
              logs: [`Ruang ${newCode} berhasil dibuat.`],
              hasRolled: false,
              isRolling: false,
              isMoving: false,
              isChoosingPath: false,
              availablePaths: [],
              stepsRemaining: 0,
              isSpinningStar: false,
              starSpinResult: null,
              isSpinAnimating: false,
              visualPath: [],
              stateSeq: 0
            });
            
            if (typeof window !== 'undefined') {
              // sessionStorage agar tidak bentrok dengan tab murid di browser yang sama
              sessionStorage.setItem(`eduboard_role_${newCode}`, 'guru');
            }
            
            // PRE-FETCH QUESTIONS
            if (config.questionSetId) {
              get().fetchQuestions(config.questionSetId, 1, false, 999);
            }

            if (socket) {
              const supabase = createClient();
              let { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                const refreshed = await supabase.auth.refreshSession();
                session = refreshed.data.session;
              }
              socket.emit("room:join", { 
                roomCode: newCode, 
                role: 'guru', 
                roomConfig: config,
                token: session?.access_token 
              });
            }
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal membuat ruangan: " + (err.message || "Terjadi kesalahan"));
          }
        },

        joinRoom: async (typedRoomCode: string, name: string, avatar?: string, color?: string) => {
          try {
            const roomData = await api.get(`/api/rooms/${typedRoomCode}`);
            if (roomData.status === 'ENDED') {
              throw new Error("Ruang permainan ini sudah berakhir.");
            }

            // Set roomCode and myGroupName synchronously FIRST
            set({ 
              myGroupName: name, 
              myAvatar: avatar,
              myColor: color,
              roomCode: typedRoomCode, 
              gameStatus: roomData.status === 'LOBBY' ? 'LOBBY' : 'PLAYING',
              isGuru: false,
              roomConfig: {
                gameDurationSec: roomData.durationMinutes * 60,
                turnDurationDasar: roomData.turnDurationDasar,
                turnDurationTantangan: roomData.turnDurationTantangan,
                turnDurationPemahaman: roomData.turnDurationPemahaman,
                maxGroups: roomData.maxGroups,
                questionSetId: roomData.questionSetId
              },
              groups: (roomData.groups || []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
              logs: [],
              pendingReviews: [],
              winner: null,
              currentCard: null,
              lastResult: null,
              isGrading: false,
              timer: 0,
              globalTimer: roomData.globalTimer || 0,
              isTimerRunning: false,
              hasRolled: false,
              isRolling: false,
              isMoving: false,
              isChoosingPath: false,
              availablePaths: [],
              stepsRemaining: 0,
              isSpinningStar: false,
              starSpinResult: null,
              isSpinAnimating: false,
              visualPath: [],
              stateSeq: 0
            });

            if (socket) {
              socket.emit("room:join", { 
                roomCode: typedRoomCode, 
                groupName: name,
                role: 'siswa',
                avatar,
                color,
              });
            }

            // FETCH QUESTIONS FOR STUDENT
            if (roomData.questionSetId) {
              get().fetchQuestions(roomData.questionSetId, 1, false, 999);
            }
          } catch (err: any) {
            // Rollback state on error
            set({ 
              myGroupName: null, 
              myAvatar: undefined, 
              myColor: undefined, 
              roomCode: '', 
              gameStatus: 'IDLE' 
            });
            toast.error(err.message || "Gagal bergabung ke ruang");
            throw err;
          }
        },

        startGame: () => {
          const { roomCode } = get();
          if (socket) socket.emit("game:start", roomCode);
        },

        endGame: () => {
          syncSet({ gameStatus: 'FINISHED' });
        },

        rejoinAsGuru: async (roomCode: string) => {
          if (socket) {
            try {
              const supabase = createClient();
              let { data: { session } } = await supabase.auth.getSession();
              
              if (!session) {
                const { data: refreshed } = await supabase.auth.refreshSession();
                session = refreshed?.session;
              }

              if (session) {
                // Fetch room data to get questionSetId
                const roomData = await api.get(`/api/rooms/${roomCode}`);
                
                socket!.emit("room:join", { 
                  roomCode, 
                  role: 'guru', 
                  token: session.access_token 
                });

                set({ isGuru: true, roomCode });

                if (roomData.questionSetId) {
                  get().fetchQuestions(roomData.questionSetId, 1, false, 999);
                }
              }
            } catch {
              // rejoin failed silently
            }
          }
        },

        checkActiveSession: async () => {
          try {
            const activeRoom = await api.get("/api/rooms/active");
            if (activeRoom) {
              set({
                roomCode: activeRoom.code,
                isGuru: true,
                gameStatus: activeRoom.status === 'ACTIVE' ? 'PLAYING' : 'LOBBY',
                roomConfig: {
                  gameDurationSec: activeRoom.durationMinutes * 60,
                  turnDurationDasar: activeRoom.turnDurationDasar,
                  turnDurationTantangan: activeRoom.turnDurationTantangan,
                  turnDurationPemahaman: activeRoom.turnDurationPemahaman,
                  maxGroups: activeRoom.maxGroups,
                  questionSetId: activeRoom.questionSetId || undefined
                },
                groups: (activeRoom.groups || []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
                logs: [`Sesi permainan aktif (${activeRoom.code}) ditemukan dan dipulihkan kembali.`]
              });

              if (typeof window !== 'undefined') {
                sessionStorage.setItem(`eduboard_role_${activeRoom.code}`, 'guru');
              }

              // Rejoin via socket to re-establish dynamic connection
              await get().rejoinAsGuru(activeRoom.code);
            }
          } catch (err) {
            console.error("Gagal memeriksa sesi aktif:", err);
          }
        },

        resetToIdle: () => {
          
          // 1. Clear flags and storage
          setLeavingFlag(true); 
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('eduboard-storage');
              sessionStorage.removeItem('eduboard_leaving');
              // Clear other potential leftover keys
              for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('eduboard_') || key.startsWith('eduboard-'))) {
                  localStorage.removeItem(key);
                }
              }
            } catch {}
          }

          // 2. Reset state
          set({
            gameStatus: 'IDLE',
            roomCode: '',
            isGuru: false,
            myGroupName: null,
            myAvatar: undefined,
            myColor: undefined,
            groups: [],
            winner: null,
            logs: [],
            currentCard: null,
            isMoving: false,
            isRolling: false,
            hasRolled: false,
            lastResult: null,
            lastClosedResultTurn: null,
            countdown: null,
            timer: 0,
            globalTimer: 0,
            isTimerRunning: false,
            isGlobalTimerRunning: false,
            pendingReviews: [],
            isGrading: false,
            stateSeq: 0
          });
          
          // Allow re-joining later if they manually enter a code
          setTimeout(() => setLeavingFlag(false), 1000);
        },
        reactivateSession: () => {
          const state = get();
          if (socket && state.roomCode && state.myGroupName) {
            socket.emit("room:join", {
              roomCode: state.roomCode,
              groupName: state.myGroupName,
              role: 'siswa',
              avatar: state.myAvatar,
              color: state.myColor,
            });
          }
        },
        exitToLobby: () => {
          set({
            gameStatus: 'IDLE',
            roomCode: '',
            myGroupName: null,
            myAvatar: undefined,
            myColor: undefined,
            groups: [],
            winner: null,
            logs: [],
            currentCard: null,
            isMoving: false,
            isRolling: false,
            hasRolled: false,
            lastResult: null,
            countdown: null,
            timer: 0,
            globalTimer: 0,
            isTimerRunning: false,
            isGlobalTimerRunning: false,
            pendingReviews: [],
            isGrading: false,
            isSuperseded: false,
            stateSeq: 0
          });
        },
        setActiveTab: (tab) => set({ activeTab: tab }),
        setSelectedSession: (session) => set({ selectedSession: session }),

        fetchQuestionSets: async (page = 1, showSkeleton = true) => {
          try {
            if (showSkeleton) set({ isLoadingSets: true });
            const res = await api.get(`/api/sets?page=${page}`);
            set((state) => ({ 
              questionSets: res.data || [],
              pagination: {
                ...state.pagination,
                sets: res.meta
              },
              isLoadingSets: false
            }));
          } catch (err: any) {
            set({ isLoadingSets: false });
            toast.error("Gagal mengambil paket soal: " + err.message);
          }
        },
        createQuestionSet: async (title, description) => {
          const toastId = toast.loading("Membuat paket soal...");
          try {
            const newSet = await api.post("/api/sets", { title, description });
            await get().fetchQuestionSets(1, false); 
            toast.dismiss(toastId);
            toast.success("Paket soal berhasil dibuat!");
            return newSet;
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal membuat paket soal: " + err.message);
            throw err;
          }
        },
        updateQuestionSet: async (id, title, description) => {
          const toastId = toast.loading("Memperbarui paket soal...");
          try {
            const updated = await api.put(`/api/sets/${id}`, { title, description });
            await get().fetchQuestionSets(get().pagination.sets.page, false);
            toast.dismiss(toastId);
            toast.success("Paket soal berhasil diperbarui!");
            return updated;
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal memperbarui paket soal: " + err.message);
            throw err;
          }
        },
        deleteQuestionSet: async (id) => {
          const toastId = toast.loading("Menghapus paket soal...");
          try {
            await api.delete(`/api/sets/${id}`);
            const currentPage = get().pagination.sets.page;
            await get().fetchQuestionSets(currentPage, false);
            
            if (get().questionSets.length === 0 && currentPage > 1) {
              await get().fetchQuestionSets(currentPage - 1, false);
            }

            set((state) => ({ 
              activeQuestionSet: state.activeQuestionSet?.id === id ? null : state.activeQuestionSet
            }));
            toast.dismiss(toastId);
            toast.success("Paket soal berhasil dihapus!");
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal menghapus paket soal: " + err.message);
            throw err;
          }
        },
        duplicatePreset: async (id) => {
          const toastId = toast.loading("Menyalin paket soal...");
          try {
            const newSet = await api.post(`/api/sets/${id}/duplicate`, {});
            await get().fetchQuestionSets(get().pagination.sets.page, false);
            toast.dismiss(toastId);
            toast.success("Paket soal berhasil disalin!");
            return newSet;
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal menyalin paket: " + err.message);
            throw err;
          }
        },
        importQuestions: async (setId: string, questions: Omit<QuestionCard, 'id' | 'setId'>[]) => {
          const toastId = toast.loading(`Mengimport ${questions.length} soal...`);
          try {
            await api.post(`/api/sets/${setId}/import`, { questions });
            await get().fetchQuestions(setId, 1, false);
            // Refresh counts in library
            await get().fetchQuestionSets(get().pagination.sets.page, false);
            toast.dismiss(toastId);
            toast.success(`Berhasil mengimport ${questions.length} soal!`);
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal mengimport soal: " + err.message);
            throw err;
          }
        },
        setActiveQuestionSet: (questionSet) => set({ 
          activeQuestionSet: questionSet,
          questions: [], // Clear old questions immediately
          pagination: {
            ...get().pagination,
            questions: { page: 1, total: 0, totalPages: 0 }
          }
        }),

        addQuestion: async (setId, q) => {
          const toastId = toast.loading("Menyimpan pertanyaan...");
          try {
            const newQ = await api.post("/api/questions", { setId, ...q });
            syncSet((state) => ({ questions: [newQ, ...state.questions] }));
            // Refresh counts in library
            await get().fetchQuestionSets(get().pagination.sets.page, false);
            toast.dismiss(toastId);
            toast.success("Pertanyaan berhasil ditambahkan!");
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal menyimpan pertanyaan: " + err.message);
            throw err;
          }
        },
        updateQuestion: async (id, updatedQ) => {
          const toastId = toast.loading("Memperbarui pertanyaan...");
          try {
            const newQ = await api.put(`/api/questions/${id}`, updatedQ);
            syncSet((state) => ({ questions: state.questions.map(q => q.id === id ? newQ : q) }));
            toast.dismiss(toastId);
            toast.success("Pertanyaan berhasil diperbarui!");
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal memperbarui pertanyaan: " + err.message);
            throw err;
          }
        },
        deleteQuestion: async (id, type = "ALL", search = "") => {
          const toastId = toast.loading("Menghapus pertanyaan...");
          try {
            await api.delete(`/api/questions/${id}`);
            const activeSet = get().activeQuestionSet;
            if (activeSet) {
              const currentPage = get().pagination.questions.page;
              await get().fetchQuestions(activeSet.id, currentPage, false, 50, type, search);
              
              if (get().questions.length === 0 && currentPage > 1) {
                await get().fetchQuestions(activeSet.id, currentPage - 1, false, 50, type, search);
              }
              // Refresh counts in library
              await get().fetchQuestionSets(get().pagination.sets.page, false);
            }
            toast.dismiss(toastId);
            toast.success("Pertanyaan berhasil dihapus!");
          } catch (err: any) {
            toast.dismiss(toastId);
            toast.error("Gagal menghapus pertanyaan: " + err.message);
            throw err;
          }
        },
        fetchQuestions: async (setId, page = 1, showSkeleton = true, limit = 50, type = "ALL", search = "") => {
          try {
            if (showSkeleton) set({ isLoadingQuestions: true });
            let url = `/api/questions?setId=${setId}&page=${page}&limit=${limit}`;
            if (type && type !== "ALL") {
              url += `&type=${type}`;
            }
            if (search && search.trim() !== "") {
              url += `&search=${encodeURIComponent(search.trim())}`;
            }
            const res = await api.get(url);
            syncSet((state) => ({ 
              questions: res.data || [],
              isLoadingQuestions: false,
              pagination: {
                ...state.pagination,
                questions: res.meta
              }
            }));
          } catch (err: any) {
            set({ isLoadingQuestions: false });
            toast.error("Gagal mengambil soal: " + err.message);
          }
        },

        drawCard: (type) => syncSet((state) => {
          // Use only database questions
          let pool = state.questions && state.questions.length > 0 ? state.questions : [];

          if (type) {
            pool = pool.filter(q => q.type?.toString().toUpperCase() === type.toUpperCase());
          }

          if (pool.length === 0) {
            toast.error("Tidak ada soal tersedia untuk tipe ini. Tambahkan soal di Dashboard terlebih dahulu!");
            return {};
          }

          const card = pool[Math.floor(Math.random() * pool.length)];

          return {
            currentCard: card,
            lastCardDrawTime: Date.now(),
            timer: (card.type === 'PEMAHAMAN' ? state.roomConfig.turnDurationPemahaman :
                   card.type === 'TANTANGAN' ? state.roomConfig.turnDurationTantangan :
                   state.roomConfig.turnDurationDasar) || (card.type === 'PEMAHAMAN' ? 90 : card.type === 'TANTANGAN' ? 60 : 30),
            isTimerRunning: true,
            logs: [`Kartu ${card.type} ditarik: ${card.text}`, ...state.logs]
          };
        }),

        rollDice: () => {
          const state = get();
          if (socket && state.roomCode) {
            socket.emit("game:roll_dice", state.roomCode);
          }
        },


        selectBranch: (nextTileId) => {
          const state = get();
          if (socket && state.roomCode) {
            socket.emit("game:select_branch", {
              roomCode: state.roomCode,
              nextTileId
            });
          }
        },

        onPionAnimationFinished: () => {
          set({ isMoving: false, visualPath: [], animatingPionId: null });
        },


        submitAnswerObjektif: (groupId, answer) => {
          const state = get();
          const card = state.currentCard;
          if (!card) return;

          const isInfoCard = answer === "SELESAI";
          const isCorrect = isInfoCard ? true : (card.answerKey === answer);
          const score = (isInfoCard && card.type === 'TANTANGAN') ? (card.points || 10) : (isCorrect ? (card.points || 10) : 0);
          
          if (socket) {
            socket.emit("student:submit_objektif", {
              roomCode: state.roomCode,
              groupId,
              questionId: card.id,
              answer,
              isCorrect: isInfoCard ? true : isCorrect,
              score: score,
              turnNumber: state.currentTurn
            });
          }
        },

        submitAnswerSubjektif: (groupId, answerText) => {
          const state = get();
          const card = state.currentCard;
          if (!card) return;

          const alreadyHasReview = state.pendingReviews.some(r => r.groupId === groupId);
          if (alreadyHasReview) {
            return;
          }

          if (socket) {
            socket.emit("student:submit_answer", {
              roomCode: state.roomCode,
              groupId,
              questionId: card.id,
              answerText,
              points: card.points || 10,
              turnNumber: state.currentTurn
            });
          }
        },

        reviewSubmission: (reviewId, score) => {
          const state = get();
          if (state.gameStatus === 'FINISHED') return;

          const review = state.pendingReviews.find(r => r.id === reviewId || r.dbAnswerId === reviewId);
          if (!review) return;

          if (socket) {
            socket.emit("teacher:grade_answer", {
              roomCode: state.roomCode,
              dbAnswerId: review.dbAnswerId || `dummy-${Date.now()}`,
              groupId: review.groupId,
              score,
              isCorrect: score > 0
            });
          }
        },

        gradeSubjektif: (reviewId, score) => {
          get().reviewSubmission(reviewId, score);
        },

        nextTurn: () => {
          const state = get();
          if (socket && state.roomCode && state.isGuru) {
            socket.emit("game:skip_turn", state.roomCode);
          }
        },


        clearLastResult: () => {
          if (resultTimeoutId) {
            clearTimeout(resultTimeoutId);
            resultTimeoutId = null;
          }
          const state = get();
          const turn = state.lastResult?.turnNumber ?? null;
          set({ lastResult: null, lastClosedResultTurn: turn });
        },
        
        handleAutoRejoin: () => {
          if (getLeavingFlag()) {
            return;
          }
          if (isJoining) {
            return;
          }

          const state = get();

          if (state.roomCode && state.gameStatus !== 'IDLE') {
            isJoining = true;
            setTimeout(() => { isJoining = false; }, 2000); // Debounce 2 seconds

            if (state.isGuru) {
              state.rejoinAsGuru(state.roomCode);
            } else if (state.myGroupName) {
              socket?.emit("room:join", { 
                roomCode: state.roomCode, 
                groupName: state.myGroupName,
                role: 'siswa',
                avatar: state.myAvatar,
                color: state.myColor
              });
            }
          }
        }
      };
    },
    {
      name: 'eduboard-storage',
      // sessionStorage: isolasi per-tab, tidak bentrok saat guru & murid
      // buka di tab terpisah dalam browser yang sama.
      // localStorage: lintas tab, menyebabkan konflik role & state.
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.sessionStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      partialize: (state) => ({ 
        roomCode: state.roomCode, 
        gameStatus: state.gameStatus,
        isGuru: state.isGuru,
        myGroupName: state.myGroupName,
        myAvatar: state.myAvatar,
        myColor: state.myColor,
        roomConfig: state.roomConfig,
        activeTab: state.activeTab,
        activeQuestionSet: state.activeQuestionSet,
        selectedSession: state.selectedSession
      }),
      onRehydrateStorage: () => (hydratedState) => {
        if (!hydratedState) return;

        // RECOVERY LOGIC: If isGuru is false but backup key says otherwise, recover it.
        // Backup juga pakai sessionStorage agar tidak bentrok antar tab.
        if (typeof window !== 'undefined' && hydratedState.roomCode) {
          const backupRole = sessionStorage.getItem(`eduboard_role_${hydratedState.roomCode}`);
          if (backupRole === 'guru' && !hydratedState.isGuru) {
            hydratedState.isGuru = true;
          }
        }

        // Handle reconnection
        const reconnectHandler = () => {
          hydratedState.handleAutoRejoin();
        };

        if (typeof window !== 'undefined') {
          const oldHandler = (window as any).__eduboardReconnectHandler;
          if (oldHandler) {
            socket?.off('connect', oldHandler);
          }
          (window as any).__eduboardReconnectHandler = reconnectHandler;
        }
        socket?.on('connect', reconnectHandler);

        if (socket?.connected) {
          hydratedState.handleAutoRejoin();
        }
      }
    }
  )
);
