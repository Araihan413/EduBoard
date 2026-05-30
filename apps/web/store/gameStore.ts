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
  isSuperseded: boolean;
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
  deleteQuestion: (id: string) => Promise<void>;
  fetchQuestions: (setId: string, page?: number, showSkeleton?: boolean, limit?: number) => Promise<void>;

  // Actions - Mekanik Permainan
  drawCard: (type?: QuestionType) => void;
  rollDice: () => void;
  moveGroup: (groupId: string, steps: number) => void;
  selectBranch: (nextTileId: number) => void;
  /** @internal — dipanggil oleh moveGroup dan selectBranch, jangan panggil langsung dari UI */
  _movePionBySteps: (groupId: string, fromTileId: number, steps: number) => void;
  /** @internal — dipanggil saat pion berhenti di tile akhir */
  _landOnTile: (groupId: string, tileId: number) => void;
  submitAnswerObjektif: (groupId: string, answer: string) => void;
  submitAnswerSubjektif: (groupId: string, answerText: string) => void;
  reviewSubmission: (reviewId: string, score: number) => void;
  gradeSubjektif: (reviewId: string, score: number) => void; // alias for reviewSubmission (used in board/page.tsx)
  nextTurn: () => void;
  decrementTimer: () => void;
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

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => {
      const syncSet = (partialOrFn: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => {
        set((state) => {
          const nextPartial = typeof partialOrFn === 'function' ? partialOrFn(state) : partialOrFn;

          if (socket && state.roomCode && state.gameStatus !== 'IDLE') {
            socket.emit("game:sync_state", { 
              roomCode: nextPartial.roomCode || state.roomCode, 
              state: nextPartial 
            });
          }
          return { ...state, ...nextPartial };
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
          console.log('[DEBUG] [STORE] Received game:state from server:', newState);
          
          const currentRoomCode = currentState.roomCode;
          const incomingRoomCode = (newState as any).roomCode || newState.roomCode;

          // Accept state only if:
          // 1. We have a local roomCode AND it matches the incoming one, OR
          // 2. Local roomCode is empty but incoming roomCode exists (just rejoined)
          const isRoomMismatch = incomingRoomCode && currentRoomCode && currentRoomCode !== incomingRoomCode;
          if (isRoomMismatch) {
            console.warn(`[DEBUG] [STORE] Ignoring state for room ${incomingRoomCode} (Current: ${currentRoomCode})`);
            return;
          }
          if (!incomingRoomCode && !currentRoomCode) {
            console.warn('[DEBUG] [STORE] Ignoring state: no roomCode on either side.');
            return;
          }

          if (newState.lastResult === null && resultTimeoutId) {
            clearTimeout(resultTimeoutId);
            resultTimeoutId = null;
          }

          // Merge server state but preserve client-only identity fields
          set((state) => {
            // Priority: current state → server state → localStorage fallback
            let finalGroupName = state.myGroupName;
            if (!finalGroupName) {
              // Try to recover from localStorage directly as last resort
              try {
                const persisted = localStorage.getItem('eduboard-storage');
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

            // PROTECT LOCAL PION POSITION DURING MOVEMENT (Solusi A):
            // If we are currently moving our own group, we ignore the incoming group position from the server's state broadcast.
            // This prevents rubber-banding / stuttering movement due to database/network latency.
            let finalGroups = newState.groups;
            if (finalGroups) {
              finalGroups = [...finalGroups].sort((a, b) => a.id.localeCompare(b.id));
            }
            const isRecentlyMovedLocally = (Date.now() - state.lastLocalMoveTime) < 2000;
            if (finalGroups && (state.isMoving || isRecentlyMovedLocally)) {
              const activeGroup = state.groups[state.activeGroupIndex];
              if (activeGroup) {
                finalGroups = finalGroups.map(g => 
                  g.id === activeGroup.id 
                    ? { ...g, position: activeGroup.position } 
                    : g
                );
              }
            }

            // PROTECT DICE STATE DURING ROLL:
            // If it is our turn, and we are currently rolling or have already rolled,
            // we protect the local dice states from being overwritten by stale server packets.
            // Namun, jika giliran/ronde baru dimulai (isNewTurnStarted), kita harus mengizinkan
            // status hasRolled dan isRolling untuk di-reset ke false agar pemain tersebut 
            // bisa memutar dadu lagi (termasuk saat uji coba 1 pemain di mana indeks tetap sama tapi ronde bertambah).
            const activeGroup = state.groups[state.activeGroupIndex];
            const isNewTurnStarted = 
              (newState.currentTurn !== undefined && newState.currentTurn !== state.currentTurn) ||
              (newState.activeGroupIndex !== undefined && newState.activeGroupIndex !== state.activeGroupIndex);
            const isMyTurn = !isGuru && activeGroup && activeGroup.name === finalGroupName;
            
            let finalDiceValue = newState.diceValue !== undefined ? newState.diceValue : state.diceValue;
            let finalIsRolling = newState.isRolling !== undefined ? newState.isRolling : state.isRolling;
            let finalHasRolled = newState.hasRolled !== undefined ? newState.hasRolled : state.hasRolled;

            if (isMyTurn && !isNewTurnStarted && (state.isRolling || state.hasRolled)) {
              finalDiceValue = state.diceValue;
              finalIsRolling = state.isRolling;
              finalHasRolled = state.hasRolled;
            }

            // PROTECT OPTIMISTIC CURRENT CARD:
            // If the local player recently drew a card, we ignore any incoming currentCard: null from the server.
            // This prevents stale server state packets from overwriting/closing our newly opened card.
            let finalCurrentCard = newState.currentCard !== undefined ? newState.currentCard : state.currentCard;
            const isRecentlyDrawnLocally = (Date.now() - state.lastCardDrawTime) < 2500;
            if (isRecentlyDrawnLocally && finalCurrentCard === null && state.currentCard !== null) {
              finalCurrentCard = state.currentCard;
            }

            const isRecentlyProfileUpdated = (Date.now() - state.lastProfileUpdateTime) < 2500;
            const finalMyAvatar = (myGroup && !isRecentlyProfileUpdated) ? (myGroup.avatar || state.myAvatar) : state.myAvatar;
            const finalMyColor = (myGroup && !isRecentlyProfileUpdated) ? (myGroup.color || state.myColor) : state.myColor;

            return {
              ...state,
              ...newState,
              currentCard: finalCurrentCard,
              isSuperseded: false,
              ...(finalGroups ? { groups: finalGroups } : {}),
              questions: finalQuestions,
              isGuru,
              myGroupName: finalGroupName, 
              roomCode: finalRoomCode,
              diceValue: finalDiceValue,
              isRolling: finalIsRolling,
              hasRolled: finalHasRolled,
              myAvatar: finalMyAvatar,
              myColor: finalMyColor
            };
          });
        });
        
        socket.on("game:timer_sync", (data: { timer: number, globalTimer: number, countdown: number | null }) => {
            const state = get();
            if (!state.roomCode || state.gameStatus === 'IDLE') return;
            set({ timer: data.timer, globalTimer: data.globalTimer, countdown: data.countdown });
           if (data.timer <= 0 && get().isTimerRunning) {
              get().decrementTimer();
           }
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

        socket.on("room:superseded", (data: { message: string }) => {
          set({ isSuperseded: true });
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
        isSuperseded: false,

        toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
        setCountdown: (val) => syncSet({ countdown: val }),
        updateGroups: (groups) => syncSet({ groups: [...groups].sort((a, b) => a.id.localeCompare(b.id)) }),
        updateGroup: (groupId, updates) => syncSet((state) => {
          const isMyGroup = state.myGroupName && state.groups.find(g => g.id === groupId)?.name === state.myGroupName;
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

          const options = ["+5", "-5", "DASAR", "TANTANGAN", "PEMAHAMAN", "SKIP"];
          const result = options[Math.floor(Math.random() * options.length)];

          syncSet({
            isSpinAnimating: true,
            starSpinResult: result,
            logs: [`Roda putar STAR berputar untuk tim ${activeG.name}...`, ...state.logs]
          });

          // Spin animation duration: 2500ms
          setTimeout(() => {
            syncSet({ isSpinAnimating: false });

            // Apply spin results after animation finishes
            setTimeout(() => {
              const innerState = get();
              const activeGroupCurrent = innerState.groups[innerState.activeGroupIndex];
              if (!activeGroupCurrent) return;

              if (result === "+5" || result === "-5") {
                const points = result === "+5" ? 5 : -5;
                const newScore = Math.max(0, activeGroupCurrent.score + points);
                
                // Show custom result notification
                syncSet((s) => ({
                  groups: s.groups.map(g => g.id === activeGroupCurrent.id ? { ...g, score: newScore } : g),
                  isSpinningStar: false,
                  lastResult: {
                    type: points > 0 ? "SUCCESS" : "FAILURE",
                    title: points > 0 ? "BONUS POIN!" : "POIN DIKURANGI!",
                    message: points > 0 
                      ? `Selamat! Tim ${activeGroupCurrent.name} mendapatkan bonus +5 poin dari roda putar STAR.` 
                      : `Aduh! Tim ${activeGroupCurrent.name} kehilangan -5 poin dari roda putar STAR.`,
                    points: points,
                    groupName: activeGroupCurrent.name
                  },
                  logs: [`Tim ${activeGroupCurrent.name} mendapat hasil roda putar: ${result} (Poin sekarang: ${newScore})`, ...s.logs]
                }));
                // Auto advance turn after showing result toast (3000ms)
                if (resultTimeoutId) clearTimeout(resultTimeoutId);
                resultTimeoutId = setTimeout(() => get().nextTurn(), 3000);

              } else if (result === "SKIP") {
                syncSet((s) => ({
                  isSpinningStar: false,
                  lastResult: {
                    type: "INFO",
                    title: "GILIRAN DILEWATI",
                    message: `Tim ${activeGroupCurrent.name} mendapat SKIP. Tidak terjadi apa-apa dan giliran dilewati.`,
                    points: 0,
                    groupName: activeGroupCurrent.name
                  },
                  logs: [`Tim ${activeGroupCurrent.name} mendapat hasil roda putar: SKIP. Giliran dilewati.`, ...s.logs]
                }));
                if (resultTimeoutId) clearTimeout(resultTimeoutId);
                resultTimeoutId = setTimeout(() => get().nextTurn(), 3000);

              } else {
                // It's a question card type: DASAR, TANTANGAN, or PEMAHAMAN!
                syncSet({ isSpinningStar: false });
                setTimeout(() => {
                  get().drawCard(result as QuestionType);
                }, 300);
              }
            }, 800); // 800ms settle delay to see the winning card before applying
          }, 2500);
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
              logs: [`Ruang ${newCode} berhasil dibuat.`]
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
            console.error(err);
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
              isTimerRunning: false
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
            } catch (err) {
              console.error("[REJOIN_GURU] Gagal:", err);
            }
          }
        },

        resetToIdle: () => {
          console.log('[DEBUG] [STORE] resetToIdle called. Wiping state and storage.');
          
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
            countdown: null,
            timer: 0,
            globalTimer: 0,
            isTimerRunning: false,
            isGlobalTimerRunning: false,
            pendingReviews: [],
            isGrading: false
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
            isSuperseded: false
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
        deleteQuestion: async (id) => {
          const toastId = toast.loading("Menghapus pertanyaan...");
          try {
            await api.delete(`/api/questions/${id}`);
            const activeSet = get().activeQuestionSet;
            if (activeSet) {
              const currentPage = get().pagination.questions.page;
              await get().fetchQuestions(activeSet.id, currentPage, false);
              
              if (get().questions.length === 0 && currentPage > 1) {
                await get().fetchQuestions(activeSet.id, currentPage - 1, false);
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
        fetchQuestions: async (setId, page = 1, showSkeleton = true, limit = 50) => {
          try {
            if (showSkeleton) set({ isLoadingQuestions: true });
            const res = await api.get(`/api/questions?setId=${setId}&page=${page}&limit=${limit}`);
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
          const val = Math.floor(Math.random() * 6) + 1;
          syncSet({ diceValue: val, isRolling: true, hasRolled: true, logs: [`Dadu dikocok... hasil: ${val}`, ...get().logs] });

          // Step 1: Stop dice animation after 1500ms (dice settles on result)
          setTimeout(() => {
            syncSet({ isRolling: false });

            // Step 2: Wait 600ms so the player can "read" the dice result,
            // then start moving the pawn
            setTimeout(() => {
              get().moveGroup(get().groups[get().activeGroupIndex].id, val);
            }, 600);
          }, 1500);
        },

        moveGroup: (groupId, steps) => {
          // Entry point for dice roll. Starts the step-by-step movement.
          const state = get();
          const group = state.groups.find(g => g.id === groupId);
          if (!group) return;
          // Set isMoving and lastLocalMoveTime immediately in the syncSet to prevent stale server overrides at the start
          syncSet({ 
            stepsRemaining: steps, 
            isChoosingPath: false, 
            availablePaths: [],
            isMoving: true,
            lastLocalMoveTime: Date.now()
          });
          get()._movePionBySteps(groupId, group.position, steps);
        },

        selectBranch: (nextTileId) => {
          // Called when the active player chooses a direction at a fork.
          const state = get();
          const group = state.groups[state.activeGroupIndex];
          if (!group) return;

          // Only the active student whose turn it is can choose the branch
          const isMyTurn = !state.isGuru && group.name?.trim().toLowerCase() === state.myGroupName?.trim().toLowerCase();
          if (!isMyTurn) return;

          const remaining = state.stepsRemaining;
          
          // Sync the choice and the new position on the server immediately to prevent snapping back to the fork
          syncSet((s) => ({
            isChoosingPath: false,
            availablePaths: [],
            groups: s.groups.map(g => g.id === group.id ? { ...g, position: nextTileId } : g)
          }));

          // Continue intermediate moves locally
          set({
            isMoving: true,
            lastLocalMoveTime: Date.now()
          });

          if (socket) {
            socket.emit('game:branch_selected', { roomCode: state.roomCode, groupId: group.id, tileId: nextTileId });
          }
          setTimeout(() => {
            const newRemaining = remaining - 1;
            // Note: we use local set() here to avoid triggering a sync broadcast during intermediate moves
            set({ stepsRemaining: newRemaining });
            if (newRemaining <= 0) {
              get()._landOnTile(group.id, nextTileId);
            } else {
              get()._movePionBySteps(group.id, nextTileId, newRemaining);
            }
          }, 450);
        },

        // Internal: step-by-step movement. Not exposed in GameActions.
        _movePionBySteps: (groupId: string, fromTileId: number, steps: number) => {
          if (steps <= 0) {
            get()._landOnTile(groupId, fromTileId);
            return;
          }
          const currentTile = getTileById(fromTileId);
          const nextIds = currentTile.next;

          if (nextIds.length === 0) {
            // Dead end (shouldn't happen in a loop board)
            get()._landOnTile(groupId, fromTileId);
            return;
          }

          if (nextIds.length > 1) {
            // FORK: stop here, sync the intermediate fork position to the server, and wait for player to choose
            const currentGroups = get().groups;
            syncSet({
              isMoving: false,
              isChoosingPath: true,
              availablePaths: nextIds,
              stepsRemaining: steps,
              groups: currentGroups.map(g => g.id === groupId ? { ...g, position: fromTileId } : g)
            });
            return;
          }

          // Straight path: move one step
          const nextId = nextIds[0];
          // Note: we use local set() instead of syncSet() here to avoid broadcasting intermediate moves
          set((s) => ({
            isMoving: true,
            groups: s.groups.map(g => g.id === groupId ? { ...g, position: nextId } : g),
            lastLocalMoveTime: Date.now()
          }));

          setTimeout(() => {
            const remaining = steps - 1;
            // Note: we use local set() here to avoid triggering a sync broadcast during intermediate moves
            set({ stepsRemaining: remaining });
            if (remaining <= 0) {
              get()._landOnTile(groupId, nextId);
            } else {
              get()._movePionBySteps(groupId, nextId, remaining);
            }
          }, 420); // ~0.4s per step matches Framer Motion animation duration
        },

        // Internal: handle landing on a tile after all steps are exhausted.
        _landOnTile: (groupId: string, tileId: number) => {
          // Sync the final groups position array with the server at landing
          const finalGroups = get().groups;
          syncSet({ 
            isMoving: false, 
            lastLocalMoveTime: Date.now(),
            groups: finalGroups
          });
          const tile = getTileById(tileId);
          const group = get().groups.find(g => g.id === groupId);
          if (!group) return;

          if (tile.type === 'SKIP') {
            syncSet((s) => ({ logs: [`${group.name} mendarat di SKIP!`, ...s.logs] }));
            setTimeout(() => get().nextTurn(), 1000);
          } else if (tile.type === 'STAR') {
            // STAR is the intersection tile! Open the Star Spin Wheel.
            syncSet((s) => ({ 
              logs: [`${group.name} mendarat di petak STAR! Roda putar aktif.`, ...s.logs],
              isSpinningStar: true,
              starSpinResult: null,
              isSpinAnimating: false
            }));
          } else {
            // Draw a question card
            setTimeout(() => {
              get().drawCard(tile.type as QuestionType);
            }, 300);
          }
        },

        submitAnswerObjektif: (groupId, answer) => {
          const state = get();
          const card = state.currentCard;
          if (!card) return;

          // Special handling for info/action cards that just need "SELESAI"
          const isInfoCard = answer === "SELESAI";
          const isCorrect = isInfoCard ? true : (card.answerKey === answer);
          
          // Action cards should give points when completed
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

          // Step 1: Close the card immediately → triggers the 800ms return animation
          syncSet({ currentCard: null, isTimerRunning: false });

          // Step 2: After card has finished closing, show the result toast
          setTimeout(() => {
            const group = get().groups.find(g => g.id === groupId);
            syncSet({
              lastResult: { 
                type: isInfoCard ? (card.type === 'TANTANGAN' ? 'SUCCESS' : 'INFO') : (isCorrect ? 'SUCCESS' : 'FAILURE'),
                title: isInfoCard ? (card.type === 'TANTANGAN' ? 'BERHASIL!' : 'LANJUT!') : (isCorrect ? 'BENAR!' : 'SALAH!'),
                message: isInfoCard 
                  ? (card.type === 'TANTANGAN' ? `Jawaban lisan berhasil disampaikan!` : `Giliran tim ${group?.name} selesai.`)
                  : (isCorrect 
                      ? `Selamat! Jawaban kamu tepat.` 
                      : (card.type === 'TANTANGAN')
                        ? `Waktu habis atau aksi belum selesai.`
                        : `Yah, kurang tepat. Jawabannya adalah: ${card.answerKey}`),
                points: score,
                groupName: group?.name || 'Siswa'
              }
            });
            // Step 3: Auto-advance after toast is shown (3s)
            if (resultTimeoutId) clearTimeout(resultTimeoutId);
            resultTimeoutId = setTimeout(() => get().nextTurn(), 3000);
          }, 850); // 800ms card animation + 50ms buffer
        },

        submitAnswerSubjektif: (groupId, answerText) => {
          const state = get();
          const card = state.currentCard;
          if (!card) return;

          // Guard: If we already have a pending review for this group in this turn, don't submit again
          const alreadyHasReview = state.pendingReviews.some(r => r.groupId === groupId);
          if (alreadyHasReview) {
            console.warn(`[submitAnswerSubjektif] Submission ignored: Group ${groupId} already has a pending review.`);
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
          syncSet((s) => ({
            isTimerRunning: false,
            logs: [`Menunggu penilaian Guru untuk jawaban ${s.groups.find(g => g.id === groupId)?.name || "Siswa"}`, ...s.logs]
          }));
        },

        reviewSubmission: (reviewId, score) => {
          const state = get();
          
          // Guard: Prevent double grading
          if (state.isGrading) return;

          const review = state.pendingReviews.find(r => r.id === reviewId);
          if (!review) {
            // Silently return if review is gone (likely already processed by another tab or sync)
            console.warn(`[gradeSubjektif] Review ${reviewId} not found. Likely already processed.`);
            return;
          }

          set({ isGrading: true });

          if (socket) {
            socket.emit("teacher:grade_answer", {
              roomCode: state.roomCode,
              dbAnswerId: review.dbAnswerId || `dummy-${Date.now()}`,
              groupId: review.groupId,
              score,
              isCorrect: score > 0
            });
          }

          // Step 1: Close the card immediately on teacher side → triggers 800ms return animation
          // This also broadcasts currentCard: null to students via syncSet
          syncSet({ currentCard: null, isTimerRunning: false });

          // Step 2: After card has finished closing, show the result toast
          setTimeout(() => {
            syncSet({
              lastResult: { 
                type: score > 0 ? 'SUCCESS' : 'FAILURE',
                title: score > 0 ? (score >= review.points ? 'TUNTAS!' : 'SEBAGIAN!') : 'BELUM TEPAT!',
                message: score > 0 
                  ? `Guru memberikan penilaian: ${score} poin untuk tim ${review.groupName}.`
                  : `Yah, jawaban tim ${review.groupName} dinilai kurang tepat oleh Guru.`,
                points: score,
                groupName: review.groupName
              }
            });
            // Step 3: Auto-advance after toast is shown (3s)
            if (resultTimeoutId) clearTimeout(resultTimeoutId);
            resultTimeoutId = setTimeout(() => get().nextTurn(), 3000);
          }, 850); // 800ms card animation + 50ms buffer
        },

        gradeSubjektif: (reviewId, score) => {
          get().reviewSubmission(reviewId, score);
        },

        nextTurn: () => {
          const state = get();
          if (state.groups.length === 0) return;

          if (resultTimeoutId) {
            clearTimeout(resultTimeoutId);
            resultTimeoutId = null;
          }

          // Find the next active group index (skipping SURRENDERED)
          let nextIndex = (state.activeGroupIndex + 1) % state.groups.length;
          let searchCount = 0;
          
          while (state.groups[nextIndex].status === 'SURRENDERED' && searchCount < state.groups.length) {
            nextIndex = (nextIndex + 1) % state.groups.length;
            searchCount++;
          }

          syncSet((s) => ({
            activeGroupIndex: nextIndex,
            currentTurn: s.currentTurn + 1,
            currentCard: null,
            lastResult: null, // Clear the toast!
            timer: 0,
            isTimerRunning: false,
            isMoving: false,
            isRolling: false,
            hasRolled: false,
            isGrading: false,
            isSpinningStar: false,
            starSpinResult: null,
            isSpinAnimating: false
          }));
        },

        decrementTimer: () => {
          const state = get();
          // Only proceed if timer is actually 0 and was previously running
          if (state.timer <= 0 && state.isTimerRunning) {
            // Immediately stop timer locally to prevent double calls during the 800ms transition
            set({ isTimerRunning: false });

            const activeG = state.groups[state.activeGroupIndex];
            
            // Only the Teacher triggers the fallback timeout submission centrally to avoid multiple submissions.
            const isGuru = typeof window !== 'undefined' && localStorage.getItem(`eduboard_role_${state.roomCode}`) === 'guru';
            
            if (isGuru) {
              // Give the active student a 1.5-second grace period to submit their drafted answer
              setTimeout(() => {
                const currentState = get();
                // If the card is STILL open, meaning the student didn't submit it in time (or is offline)
                // AND we are not currently in the middle of a grading process
                if (currentState.currentCard?.id === state.currentCard?.id && !currentState.isGrading) {
                   if (currentState.currentCard?.type === 'DASAR') {
                     currentState.submitAnswerObjektif(activeG.id, "TIMEOUT");
                   } else if (currentState.currentCard?.type === 'PEMAHAMAN' || currentState.currentCard?.type === 'TANTANGAN') {
                     // Only submit fallback if the student hasn't submitted yet
                     const alreadySubmitted = currentState.pendingReviews.some(r => r.groupId === activeG.id);
                     if (!alreadySubmitted) {
                        const fallbackMsg = currentState.currentCard?.type === 'PEMAHAMAN' 
                          ? "Waktu habis, jawaban tulisan belum selesai." 
                          : "Waktu habis, siswa belum selesai menjawab lisan.";
                        currentState.submitAnswerSubjektif(activeG.id, fallbackMsg);
                     }
                   }
                }
              }, 5000);
            }
          }
        },

        clearLastResult: () => {
          // Manually closing the toast should immediately advance the turn
          get().nextTurn();
        },
        
        handleAutoRejoin: () => {
          if (getLeavingFlag()) {
            console.log('[DEBUG] [STORE] Skipping auto-rejoin: user is leaving intentionally.');
            return;
          }
          if (isJoining) {
            console.log('[DEBUG] [STORE] handleAutoRejoin skipped: already joining.');
            return;
          }

          const state = get();
          console.log('[DEBUG] [STORE] handleAutoRejoin called. Current State:', { 
            roomCode: state.roomCode, 
            gameStatus: state.gameStatus, 
            myGroupName: state.myGroupName,
            isGuru: state.isGuru
          });

          if (state.roomCode && state.gameStatus !== 'IDLE') {
            isJoining = true;
            setTimeout(() => { isJoining = false; }, 2000); // Debounce 2 seconds

            if (state.isGuru) {
              console.log('[DEBUG] [STORE] Auto-rejoining as Guru for room:', state.roomCode);
              state.rejoinAsGuru(state.roomCode);
            } else if (state.myGroupName) {
              console.log('[DEBUG] [STORE] Auto-rejoining as Student:', state.myGroupName, 'for room:', state.roomCode);
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
