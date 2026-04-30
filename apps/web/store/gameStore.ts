import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { createClient } from '../lib/supabase/client';

// Types
export type GroupStatus = 'ACTIVE' | 'SKIP_NEXT' | 'WAITING' | 'SURRENDERED';
export type GameStatus = 'IDLE' | 'LOBBY' | 'PLAYING' | 'FINISHED';
export type QuestionType = 'DASAR' | 'AKSI' | 'TANTANGAN';

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
  turnDurationAksi: number;
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
  fetchQuestions: (setId: string, page?: number, showSkeleton?: boolean) => Promise<void>;

  // Actions - Mekanik Permainan
  drawCard: (type?: QuestionType) => void;
  rollDice: () => void;
  moveGroup: (groupId: string, steps: number) => void;
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
  
  // Sync
  setStateFromSync: (state: Partial<GameState>) => void;
  handleAutoRejoin: () => void;
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

export const getTileTypeAt = (index: number): QuestionType | "SKIP" => {
  if (index === 0) return "DASAR";
  const patterns: (QuestionType | "SKIP")[] = [
    "DASAR", "DASAR", "AKSI", "TANTANGAN", "SKIP", 
    "DASAR", "DASAR", "TANTANGAN", "AKSI", "TANTANGAN", "AKSI",
    "DASAR", "TANTANGAN", "SKIP", "DASAR", "AKSI", "TANTANGAN",
    "DASAR", "SKIP", "AKSI", "DASAR", "TANTANGAN", "DASAR",
    "AKSI", "TANTANGAN", "AKSI", "DASAR", "SKIP", "TANTANGAN", "AKSI"
  ];
  return patterns[(index - 1) % 30];
};

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

            const myGroup = newState.groups?.find(g => g.name === finalGroupName);
            
            // PROTECT QUESTIONS: Don't overwrite existing questions with an empty array from server
            const finalQuestions = (newState.questions && newState.questions.length > 0) 
              ? newState.questions 
              : state.questions;

            return {
              ...state,
              ...newState,
              questions: finalQuestions,
              isGuru,
              myGroupName: finalGroupName, 
              roomCode: finalRoomCode,
              ...(myGroup ? {
                myAvatar: myGroup.avatar || state.myAvatar,
                myColor: myGroup.color || state.myColor
              } : {})
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
      }

      return {
        isGuru: false,
        gameStatus: 'IDLE',
        roomCode: '',
        roomConfig: { 
          gameDurationSec: 600, 
          turnDurationDasar: 30, 
          turnDurationTantangan: 60, 
          turnDurationAksi: 15, 
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

        toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
        setCountdown: (val) => syncSet({ countdown: val }),
        updateGroups: (groups) => syncSet({ groups }),
        updateGroup: (groupId, updates) => syncSet((state) => ({
          groups: state.groups.map(g => g.id === groupId ? { ...g, ...updates } : g)
        })),
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
        setStateFromSync: (newState) => set(newState),


        createRoom: async (config) => {
          try {
            const room = await api.post("/api/rooms", {
              durationMinutes: config.gameDurationSec / 60,
              turnDurationDasar: config.turnDurationDasar,
              turnDurationTantangan: config.turnDurationTantangan,
              turnDurationAksi: config.turnDurationAksi,
              maxGroups: config.maxGroups,
              questionSetId: config.questionSetId
            });
            const newCode = room.code;
            set({
              gameStatus: 'LOBBY',
              roomCode: newCode,
              isGuru: true,
              roomConfig: config,
              groups: [], // CLEAR old groups
              pendingReviews: [], // CLEAR old reviews
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
              localStorage.setItem(`eduboard_role_${newCode}`, 'guru');
            }
            
            // PRE-FETCH QUESTIONS
            if (config.questionSetId) {
              get().fetchQuestions(config.questionSetId);
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
                turnDurationAksi: roomData.turnDurationAksi,
                maxGroups: roomData.maxGroups,
                questionSetId: roomData.questionSetId
              },
              groups: roomData.groups || [],
              logs: [],
              pendingReviews: [],
              winner: null,
              currentCard: null,
              lastResult: null,
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
              get().fetchQuestions(roomData.questionSetId);
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
                  get().fetchQuestions(roomData.questionSetId);
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
            lastResult: null,
            countdown: null,
            timer: 0,
            globalTimer: 0,
            isTimerRunning: false,
            isGlobalTimerRunning: false,
            pendingReviews: []
          });
          
          // Allow re-joining later if they manually enter a code
          setTimeout(() => setLeavingFlag(false), 1000);
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
            toast.success("Paket soal berhasil dibuat!", { id: toastId });
            return newSet;
          } catch (err: any) {
            toast.error("Gagal membuat paket soal: " + err.message, { id: toastId });
            throw err;
          }
        },
        updateQuestionSet: async (id, title, description) => {
          const toastId = toast.loading("Memperbarui paket soal...");
          try {
            const updated = await api.put(`/api/sets/${id}`, { title, description });
            await get().fetchQuestionSets(get().pagination.sets.page, false);
            toast.success("Paket soal berhasil diperbarui!", { id: toastId });
            return updated;
          } catch (err: any) {
            toast.error("Gagal memperbarui paket soal: " + err.message, { id: toastId });
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
            toast.success("Paket soal berhasil dihapus!", { id: toastId });
          } catch (err: any) {
            toast.error("Gagal menghapus paket soal: " + err.message, { id: toastId });
            throw err;
          }
        },
        duplicatePreset: async (id) => {
          const toastId = toast.loading("Menyalin paket soal...");
          try {
            const newSet = await api.post(`/api/sets/${id}/duplicate`, {});
            await get().fetchQuestionSets(get().pagination.sets.page, false);
            toast.success("Paket soal berhasil disalin!", { id: toastId });
            return newSet;
          } catch (err: any) {
            toast.error("Gagal menyalin paket: " + err.message, { id: toastId });
            throw err;
          }
        },
        importQuestions: async (setId: string, questions: Omit<QuestionCard, 'id' | 'setId'>[]) => {
          const toastId = toast.loading(`Mengimport ${questions.length} soal...`);
          try {
            await api.post(`/api/sets/${setId}/import`, { questions });
            await get().fetchQuestions(setId, 1, false);
            toast.success(`Berhasil mengimport ${questions.length} soal!`, { id: toastId });
          } catch (err: any) {
            toast.error("Gagal mengimport soal: " + err.message, { id: toastId });
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
            toast.success("Pertanyaan berhasil ditambahkan!", { id: toastId });
          } catch (err: any) {
            toast.error("Gagal menyimpan pertanyaan: " + err.message, { id: toastId });
            throw err;
          }
        },
        updateQuestion: async (id, updatedQ) => {
          const toastId = toast.loading("Memperbarui pertanyaan...");
          try {
            const newQ = await api.put(`/api/questions/${id}`, updatedQ);
            syncSet((state) => ({ questions: state.questions.map(q => q.id === id ? newQ : q) }));
            toast.success("Pertanyaan berhasil diperbarui!", { id: toastId });
          } catch (err: any) {
            toast.error("Gagal memperbarui pertanyaan: " + err.message, { id: toastId });
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
            }
            toast.success("Pertanyaan berhasil dihapus!", { id: toastId });
          } catch (err: any) {
            toast.error("Gagal menghapus pertanyaan: " + err.message, { id: toastId });
            throw err;
          }
        },
        fetchQuestions: async (setId, page = 1, showSkeleton = true) => {
          try {
            if (showSkeleton) set({ isLoadingQuestions: true });
            const res = await api.get(`/api/questions?setId=${setId}&page=${page}`);
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
            lastResult: null,
            timer: (card.type === 'TANTANGAN' ? state.roomConfig.turnDurationTantangan :
                   card.type === 'AKSI' ? state.roomConfig.turnDurationAksi :
                   state.roomConfig.turnDurationDasar) || (card.type === 'TANTANGAN' ? 60 : card.type === 'AKSI' ? 15 : 30),
            isTimerRunning: true,
            logs: [`Kartu ${card.type} ditarik: ${card.text}`, ...state.logs]
          };
        }),

        rollDice: () => {
          const val = Math.floor(Math.random() * 6) + 1;
          syncSet({ diceValue: val, isRolling: true, logs: [`Dadu dikocok... hasil: ${val}`, ...get().logs] });
          setTimeout(() => {
            syncSet({ isRolling: false });
            get().moveGroup(get().groups[get().activeGroupIndex].id, val);
          }, 1500);
        },

        moveGroup: (groupId, steps) => {
          const state = get();
          const group = state.groups.find(g => g.id === groupId);
          if (!group) return;
          let newPos = group.position + steps;
          if (newPos > 30) {
            newPos = newPos % 30;
            if (newPos === 0) newPos = 30; // 30 is the last tile, 1 is the first. 0 is only for start.
          }
          syncSet((s) => ({
            isMoving: true,
            groups: s.groups.map(g => g.id === groupId ? { ...g, position: newPos } : g),
            logs: [`${group.name} melangkah ${steps} petak ke posisi ${newPos}`, ...s.logs]
          }));
          setTimeout(() => {
            syncSet({ isMoving: false });
            const finalType = getTileTypeAt(newPos);
            if (finalType === "SKIP") {
              syncSet((s) => ({ logs: [`${group.name} mendarat di SKIP!`, ...s.logs] }));
              setTimeout(() => get().nextTurn(), 1000);
            } else {
              get().drawCard(finalType as QuestionType);
            }
          }, steps * 500);
        },

        submitAnswerObjektif: (groupId, answer) => {
          const state = get();
          const card = state.currentCard;
          if (!card) return;

          // Special handling for info/action cards that just need "SELESAI"
          const isInfoCard = answer === "SELESAI";
          const isCorrect = isInfoCard ? true : (card.answerKey === answer);
          
          // Action cards should give points when completed
          const score = (isInfoCard && card.type === 'AKSI') ? (card.points || 10) : (isCorrect ? (card.points || 10) : 0);
          
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
                type: isInfoCard ? (card.type === 'AKSI' ? 'SUCCESS' : 'INFO') : (isCorrect ? 'SUCCESS' : 'FAILURE'),
                title: isInfoCard ? (card.type === 'AKSI' ? 'BERHASIL!' : 'LANJUT!') : (isCorrect ? 'BENAR!' : 'SALAH!'),
                message: isInfoCard 
                  ? (card.type === 'AKSI' ? `Aksi berhasil dilakukan!` : `Giliran tim ${group?.name} selesai.`)
                  : (isCorrect 
                      ? `Selamat! Jawaban kamu tepat.` 
                      : (card.type === 'AKSI')
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
          if (socket && card) {
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
          const review = state.pendingReviews.find(r => r.id === reviewId);
          if (!review) {
            console.error(`[gradeSubjektif] Review tidak ditemukan: id=${reviewId}. Daftar review:`, state.pendingReviews);
            return;
          }

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
            isRolling: false
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
                // If the card is STILL open, meaning the student didn't submit it in time (or is offline)
                if (get().currentCard?.id === state.currentCard?.id) {
                   if (state.currentCard?.type === 'DASAR' || state.currentCard?.type === 'AKSI') {
                     get().submitAnswerObjektif(activeG.id, "TIMEOUT");
                   } else if (state.currentCard?.type === 'TANTANGAN') {
                     get().submitAnswerSubjektif(activeG.id, "(Waktu habis, siswa tidak merespon)");
                   }
                }
              }, 1500);
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
        if (typeof window !== 'undefined' && hydratedState.roomCode) {
          const backupRole = localStorage.getItem(`eduboard_role_${hydratedState.roomCode}`);
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
