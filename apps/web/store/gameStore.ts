import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api } from '../lib/api';

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

export interface QuestionCard {
  id: string;
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
  
  questions: QuestionCard[];
  pendingReviews: PendingReview[];
  sessionHistory: SessionHistory[];
  
  winner: Group | null;
  logs: string[];
  myGroupName: string | null;
  lastResult: AnswerResult | null;
  isMuted: boolean;
  countdown: number | null;
}

interface GameActions {
  toggleMute: () => void;
  setCountdown: (val: number | null) => void;
  createRoom: (config: RoomConfig) => Promise<void>;
  joinRoom: (roomCode: string, name: string, avatar?: string, color?: string) => void;
  startGame: () => void;
  endGame: () => void;
  resetToIdle: () => void;

  // Actions - Pertanyaan
  addQuestion: (q: Omit<QuestionCard, 'id'>) => Promise<void>;
  updateQuestion: (id: string, q: Partial<QuestionCard>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  fetchQuestions: () => Promise<void>;

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
}



export let socket: Socket | null = null;
if (typeof window !== 'undefined') {
  socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');
}

let resultTimeoutId: NodeJS.Timeout | null = null;

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
          if (socket) {
            socket.emit("game:sync_state", { 
              roomCode: nextPartial.roomCode || state.roomCode, 
              state: nextPartial 
            });
          }
          return { ...state, ...nextPartial };
        });
      };

      if (socket) {
        socket.on("game:state", (newState: Partial<GameState>) => {
          // Abaikan update state dari server jika kita sudah keluar dari room (roomCode kosong)
          if (!get().roomCode) return;

          // If another client advanced the turn and cleared the result, cancel our local timeout
          if (newState.lastResult === null && resultTimeoutId) {
            clearTimeout(resultTimeoutId);
            resultTimeoutId = null;
          }
          set(newState);
        });
        
        socket.on("game:timer_sync", (data: { timer: number, globalTimer: number, countdown: number | null }) => {
           if (!get().roomCode) return;
           set({ timer: data.timer, globalTimer: data.globalTimer, countdown: data.countdown });
           if (data.timer <= 0 && get().isTimerRunning) {
              get().decrementTimer();
           }
        });
      }

      return {
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
        questions: [],
        pendingReviews: [],
        sessionHistory: [],
        winner: null,
        logs: [],
        myGroupName: null,
        lastResult: null,
        isMuted: false,
        countdown: null,

        toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
        setCountdown: (val) => syncSet({ countdown: val }),
        updateGroups: (groups) => syncSet({ groups }),
        updateGroup: (groupId, updates) => syncSet((state) => ({
          groups: state.groups.map(g => g.id === groupId ? { ...g, ...updates } : g)
        })),
        leaveRoom: (roomCode, name) => {
          if (socket) {
            socket.emit("room:leave", { roomCode, groupName: name });
          }
          get().resetToIdle();
        },
        cancelRoom: (roomCode) => {
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
              maxGroups: config.maxGroups
            });
            const newCode = room.code;
            set((state) => ({
              gameStatus: 'LOBBY',
              roomCode: newCode,
              roomConfig: config,
              groups: [],
              winner: null,
              logs: [`Ruang ${newCode} berhasil dibuat.`, ...state.logs]
            }));
            if (typeof window !== 'undefined') {
              localStorage.setItem(`eduboard_role_${newCode}`, 'guru');
            }
            if (socket) {
              socket.emit("room:join", { roomCode: newCode, role: 'guru', roomConfig: config });
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

            set({ myGroupName: name, roomCode: typedRoomCode });
            if (socket) {
              socket.emit("room:join", { 
                roomCode: typedRoomCode, 
                groupName: name,
                avatar,
                color
              });
            }
          } catch (err: any) {
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

        resetToIdle: () => {
          set({
            gameStatus: 'IDLE',
            roomCode: '',
            groups: [],
            winner: null,
            logs: [],
            currentCard: null,
            myGroupName: null,
            isMoving: false,
            isRolling: false
          });
        },

        addQuestion: async (q) => {
          const newQ = await api.post("/api/questions", q);
          syncSet((state) => ({ questions: [newQ, ...state.questions] }));
        },
        updateQuestion: async (id, updatedQ) => {
          const newQ = await api.put(`/api/questions/${id}`, updatedQ);
          syncSet((state) => ({ questions: state.questions.map(q => q.id === id ? newQ : q) }));
        },
        deleteQuestion: async (id) => {
          await api.delete(`/api/questions/${id}`);
          syncSet((state) => ({ questions: state.questions.filter(q => q.id !== id) }));
        },
        fetchQuestions: async () => {
          const data = await api.get("/api/questions");
          set({ questions: data });
        },

        drawCard: (type) => syncSet((state) => {
          // Use only database questions
          let pool = state.questions && state.questions.length > 0 ? state.questions : [];

          if (type) {
            pool = pool.filter(q => q.type === type);
          }

          if (pool.length === 0) {
            toast.error("Tidak ada soal tersedia untuk tipe ini. Tambahkan soal di Dashboard terlebih dahulu!");
            return {};
          }

          const card = pool[Math.floor(Math.random() * pool.length)];

          return {
            currentCard: card,
            lastResult: null,
            timer: card.type === 'TANTANGAN' ? state.roomConfig.turnDurationTantangan :
                   card.type === 'AKSI' ? state.roomConfig.turnDurationAksi :
                   state.roomConfig.turnDurationDasar,
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
                  : (isCorrect ? `Selamat! Jawaban kamu tepat.` : `Yah, kurang tepat. Jawabannya adalah: ${card.answerKey}`),
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
            if (state.currentCard?.type === 'DASAR') get().submitAnswerObjektif(activeG.id, "TIMEOUT");
            else if (state.currentCard?.type === 'TANTANGAN') get().submitAnswerSubjektif(activeG.id, "(Waktu habis, tidak ada jawaban)");
          }
        },


        clearLastResult: () => {
          // Manually closing the toast should immediately advance the turn
          get().nextTurn();
        }
      };
    },
    {
      name: 'eduboard-storage',
      partialize: (state) => ({ 
        roomCode: state.roomCode, 
        gameStatus: state.gameStatus,
        myGroupName: state.myGroupName,
        roomConfig: state.roomConfig
      }),
    }
  )
);
