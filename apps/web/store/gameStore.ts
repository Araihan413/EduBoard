import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// Types
export type GroupStatus = 'ACTIVE' | 'SKIP_NEXT' | 'WAITING';
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
}

export interface QuestionCard {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  options?: string[];
  answerKey?: string;
}

export interface PendingReview {
  id: string;
  groupId: string;
  groupName: string;
  questionText: string;
  answerText: string;
  maxPoints: number;
  type: QuestionType;
}

export interface AnswerResult {
  type: 'SUCCESS' | 'FAILURE' | 'NEUTRAL';
  title: string;
  message: string;
  points: number;
  groupName: string;
}

export interface RoomConfig {
  gameDurationSec: number;
  turnDurationDasar: number;
  turnDurationTantangan: number;
  turnDurationAksi: number;
  maxGroups: number;
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

interface GameState {
  gameStatus: GameStatus;
  roomCode: string;
  roomConfig: RoomConfig;
  groups: Group[];
  activeGroupIndex: number;
  currentTurn: number;
  timer: number; // Card countdown
  globalTimer: number; // Session countdown
  isTimerRunning: boolean; // Card countdown active
  isGlobalTimerRunning: boolean; // Session countdown active
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

  toggleMute: () => void;
  setCountdown: (val: number | null) => void;
  createRoom: (config: RoomConfig) => void;
  joinRoom: (roomCode: string, name: string, avatar?: string, color?: string) => void;
  startGame: () => void;
  endGame: () => void;
  resetToIdle: () => void;

  // Actions - Pertanyaan
  addQuestion: (q: Omit<QuestionCard, 'id'>) => void;
  updateQuestion: (id: string, q: Partial<QuestionCard>) => void;
  deleteQuestion: (id: string) => void;

  // Actions - Mekanik Permainan
  drawCard: (type?: QuestionType) => void;
  submitAnswerObjektif: (groupId: string, answer: string) => void;
  submitAnswerSubjektif: (groupId: string, answerText: string) => void;
  gradeSubjektif: (reviewId: string, score: number) => void;
  rollDice: () => void;
  nextTurn: () => void;
  decrementTimer: () => void;
  clearLastResult: () => void;
  
  updateGroups: (groups: Group[]) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  
  // Sync
  setStateFromSync: (state: Partial<GameState>) => void;
}

// Dummy Soal Bank Awal
const DUMMY_QUESTIONS: QuestionCard[] = [
  { id: 'q1', type: 'DASAR', text: 'Apa hukum tajwid dari Nun Sukun bertemu huruf Ba?', points: 10, options: ['Ikhfa', 'Iqlab', 'Izhar', 'Idgham Bighunnah'], answerKey: 'Iqlab' },
  { id: 'q2', type: 'DASAR', text: 'Malaikat yang bertugas membagi rezeki adalah...', points: 10, options: ['Mikail', 'Jibril', 'Israfil', 'Izrail'], answerKey: 'Mikail' },
  { id: 'q4', type: 'TANTANGAN', text: 'Sebutkan 3 rukun haji yang kamu ketahui! (Guru akan menilai 0-30 poin)', points: 30 },
  { id: 'q5', type: 'AKSI', text: 'Maju 2 petak karena kamu membantu teman mengaji hari ini!', points: 10 },
  { id: 'q6', type: 'DASAR', text: 'Surah pendek pertama dalam urutan juz 30 adalah...', points: 10, options: ['An-Naba', 'An-Naziat', 'Al-Mursalat', 'Abasa'], answerKey: 'An-Naba' },
];

export let socket: Socket | null = null;
if (typeof window !== 'undefined') {
  socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');
}

// Tile Type Helper (Shared between Store and UI logic)
export const getTileTypeAt = (index: number): QuestionType | "SKIP" => {
  if (index === 0) return "DASAR"; // Fallback for start zone if needed, though usually index starts at 1
  const patterns: (QuestionType | "SKIP")[] = [
    "DASAR", "DASAR", "AKSI", "TANTANGAN", "SKIP", 
    "DASAR", "DASAR", "TANTANGAN", "AKSI", "TANTANGAN", "AKSI",
    "DASAR", "TANTANGAN", "SKIP", "DASAR", "AKSI", "TANTANGAN",
    "DASAR", "SKIP", "AKSI", "DASAR", "TANTANGAN", "DASAR",
    "AKSI", "TANTANGAN", "AKSI", "DASAR", "SKIP", "TANTANGAN", "AKSI"
  ];
  return patterns[(index - 1) % 30];
};

export const useGameStore = create<GameState>((set, get) => {
  
  const syncSet = (partialOrFn: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => {
    set((state) => {
      const nextPartial = typeof partialOrFn === 'function' ? partialOrFn(state) : partialOrFn;
      
      // Emit only the partial update to the server
      if (socket) {
        socket.emit("game:sync_state", { 
          roomCode: nextPartial.roomCode || state.roomCode, 
          state: nextPartial 
        });
      }
      
      // CRITICAL: Return the MERGED state, not just the partial
      return { ...state, ...nextPartial };
    });
  };

  if (socket) {
    socket.on("game:state", (newState: Partial<GameState>) => {
      // In the new atomic model, we simply apply the state.
      // The UI (BoardCanvas) will detect position changes and animate accordingly.
      set(newState);
    });
    
    socket.on("game:timer_sync", (data: { timer: number, globalTimer: number, countdown: number | null }) => {
       set({ timer: data.timer, globalTimer: data.globalTimer, countdown: data.countdown });
       
       // Handle global timeout
       if (data.globalTimer <= 0 && get().gameStatus === 'PLAYING') {
          const winState = calculateWinner(get().groups, get());
          if (winState) {
            syncSet({ ...winState, isTimerRunning: false, isGlobalTimerRunning: false });
          }
       }
       
       // Handle card timeout (Answer Timer)
       if (data.timer <= 0 && get().isTimerRunning) {
          get().decrementTimer(); // logic for auto-wrong
       }
    });
  }

  const calculateWinner = (groups: Group[], currentState: GameState): Partial<GameState> | null => {
    if (groups.length === 0) return null;
    
    // Sort by score descending
    const sorted = [...groups].sort((a, b) => b.score - a.score);
    const topGroup = sorted[0];
    
    const historyItem: SessionHistory = {
      id: `ses-${Date.now()}`,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      roomCode: currentState.roomCode,
      winner: topGroup.name,
      winnerScore: topGroup.score,
      totalGroups: groups.length,
      leaderboard: sorted // Already sorted by score
    };
    
    return {
      gameStatus: 'FINISHED',
      winner: topGroup,
      sessionHistory: [historyItem, ...currentState.sessionHistory],
      logs: [`WAKTU HABIS! ${topGroup.name} menang dengan ${topGroup.score} poin!`, ...currentState.logs]
    };
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
    
    questions: DUMMY_QUESTIONS,
    pendingReviews: [],
    sessionHistory: [
      { id: 'old1', date: '12 April 2026, 09:00', roomCode: 'X99ABC', winner: 'Kelompok Khadijah', winnerScore: 120, totalGroups: 4, leaderboard: [
        { id: 'g1', name: 'Kelompok Khadijah', score: 120, position: 28, status: 'ACTIVE' },
        { id: 'g2', name: 'Kelompok Fatimah', score: 90, position: 24, status: 'ACTIVE' },
        { id: 'g3', name: 'Kelompok Aisyah', score: 85, position: 20, status: 'ACTIVE' },
        { id: 'g4', name: 'Kelompok Maryam', score: 40, position: 12, status: 'ACTIVE' },
      ] }
    ],
    
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

    setStateFromSync: (newState) => set(newState),

    createRoom: (config) => {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Update local state first to ensure UI is ready
      set((state) => ({
        gameStatus: 'LOBBY',
        roomCode: newCode,
        roomConfig: config,
        groups: [],
        winner: null,
        logs: [`Room ${newCode} dibuat. Menunggu peserta bergabung...`, ...state.logs]
      }));

      // Persist role
      if (typeof window !== 'undefined') {
        localStorage.setItem(`eduboard_role_${newCode}`, 'guru');
      }

      // Join and then Sync the config to server
      if (socket) {
        socket.emit("room:join", { roomCode: newCode, role: 'guru', roomConfig: config });
        // Sync the config specifically to ensure server has it
        socket.emit("game:sync_state", { 
          roomCode: newCode, 
          state: { roomConfig: config, gameStatus: 'LOBBY' } 
        });
      }
    },

    joinRoom: (typedRoomCode: string, name: string, avatar?: string, color?: string) => {
      // Save local identity and room code immediately
      set({ myGroupName: name, roomCode: typedRoomCode });

      if (typeof window !== 'undefined') {
        localStorage.setItem(`eduboard_name_${typedRoomCode}`, name);
        localStorage.setItem(`eduboard_role_${typedRoomCode}`, 'siswa');
      }
      if (socket) socket.emit("room:join", { 
        roomCode: typedRoomCode, 
        role: 'siswa', 
        groupName: name,
        avatar,
        color
      });
    },

    startGame: () => {
      const state = get();
      const activeGroups = (state.groups || []).map(g => ({ ...g, status: 'ACTIVE' as GroupStatus }));
      if (socket) {
        // First sync the active groups
        socket.emit("game:sync_state", { 
          roomCode: state.roomCode, 
          state: { groups: activeGroups } 
        });
        // Then tell server to start (which triggers countdown)
        socket.emit("game:start", state.roomCode);
      }
    },

    endGame: () => syncSet((state) => {
      const sorted = [...state.groups].sort((a,b) => b.score - a.score);
      const winner = sorted[0] || null;
      
      const sessionHistory = [...state.sessionHistory];
      if (winner && state.gameStatus === 'PLAYING') {
        sessionHistory.unshift({
           id: `ses-${Date.now()}`,
           date: new Date().toLocaleDateString('id-ID'),
           roomCode: state.roomCode,
           winner: winner.name,
           winnerScore: winner.score,
           totalGroups: state.groups.length,
           leaderboard: sorted
        });
      }

      return {
        gameStatus: 'FINISHED',
        winner,
        isTimerRunning: false,
        isGlobalTimerRunning: false,
        globalTimer: 0,
        sessionHistory,
        logs: ["Game diakhiri oleh Guru secara manual.", ...state.logs]
      }
    }),

    resetToIdle: () => syncSet(() => ({
       gameStatus: 'IDLE',
       roomCode: '',
       groups: [],
       activeGroupIndex: 0,
       currentTurn: 1,
       timer: 0,
       isTimerRunning: false,
       currentCard: null,
       pendingReviews: [],
       winner: null,
       logs: ["Sistem sedia..."]
    })),

    addQuestion: (q) => syncSet((state) => ({
      questions: [{ ...q, id: `q-${Date.now()}-${Math.floor(Math.random() * 10000)}` }, ...state.questions]
    })),

    updateQuestion: (id, updatedQ) => syncSet((state) => ({
      questions: state.questions.map(q => q.id === id ? { ...q, ...updatedQ } : q)
    })),

    deleteQuestion: (id) => syncSet((state) => ({
      questions: state.questions.filter(q => q.id !== id)
    })),

    drawCard: (type?: QuestionType) => syncSet((state) => {
      let pool = state.questions && state.questions.length > 0 ? state.questions : DUMMY_QUESTIONS;
      
      if (type) {
        const filtered = pool.filter(q => q.type === type);
        if (filtered.length > 0) pool = filtered;
      }

      const randIdx = Math.floor(Math.random() * pool.length);
      const card = pool[randIdx];
      
      // Use dynamic timers from roomConfig
      const conf = state.roomConfig;
      const cardT = card.type === 'TANTANGAN' ? (conf.turnDurationTantangan || 60) :
                  (card.type === 'AKSI' ? (conf.turnDurationAksi || 15) : (conf.turnDurationDasar || 30));

      return { 
        currentCard: card,
        timer: cardT,
        isTimerRunning: true,
        logs: [`${state.groups[state.activeGroupIndex]?.name} mengambil Kartu ${card.type}.`, ...(state.logs || [])]
      };
    }),

    submitAnswerObjektif: (groupId, answer) => syncSet((state) => {
      const card = state.currentCard;
      if (!card) return {};

      let earnedPoints = 0;
      let stepsToMove = 0;
      const newGroupStatus: GroupStatus = 'ACTIVE';
      const groupName = state.groups.find(g => g.id === groupId)?.name || '';
      let logMsg = '';

      if (card.type === 'DASAR') {
        if (answer === card.answerKey) {
          earnedPoints = card.points;
          logMsg = `(DASAR) ${groupName} Benar! +${earnedPoints} poin.`;
        } else {
          // Movement penalty removed as requested
          stepsToMove = 0;
          logMsg = `(DASAR) ${groupName} SALAH! Tidak ada poin didapat.`;
        }
      } else if (card.type === 'AKSI') {
        earnedPoints = card.points;
        logMsg = `(AKSI) ${groupName} mengeksekusi instruksi aksi.`;
      }
      
      const newGroups = state.groups.map(g => {
        if (g.id !== groupId) return g;
        
        // Loop logic for 1-30: ((pos + steps - 1) % 30) + 1
        // For position 0 (Start), we treat it as starting from 0 for the first jump
        let targetPos = g.position;
        if (targetPos === 0) {
           targetPos = Math.max(1, stepsToMove); // Can't move negative from start
        } else {
           targetPos = ((g.position + stepsToMove - 1 + 30) % 30) + 1;
        }

        return { ...g, score: g.score + earnedPoints, position: targetPos, status: newGroupStatus };
      });

      // No winner check here anymore, we wait for timer to run out.

      // Auto next turn after 5 seconds
      setTimeout(() => {
         get().nextTurn();
      }, 5000);

      return {
        groups: newGroups,
        currentCard: null,
        lastResult: card.type === 'DASAR' ? {
          type: answer === card.answerKey ? 'SUCCESS' : 'FAILURE',
          title: answer === card.answerKey ? 'BENAR!' : 'SALAH!',
          message: answer === card.answerKey ? `Kamu mendapatkan ${earnedPoints} poin.` : `Jawaban yang benar adalah: ${card.answerKey}`,
          points: earnedPoints,
          groupName
        } : {
          type: 'SUCCESS',
          title: 'BERHASIL!',
          message: 'Instruksi aksi telah dijalankan.',
          points: earnedPoints,
          groupName
        },
        // isTimerRunning remains true for global timer
        logs: [logMsg, ...(state.logs || [])]
      };
    }),

    submitAnswerSubjektif: (groupId, answerText) => syncSet((state) => {
      const card = state.currentCard;
      if (!card || card.type !== 'TANTANGAN') return {};
      
      const groupName = state.groups.find(g => g.id === groupId)?.name || '';
      
      const newReview: PendingReview = {
        id: `rev-${Date.now()}`,
        groupId,
        groupName,
        questionText: card.text,
        answerText,
        maxPoints: card.points,
        type: card.type
      };

      return {
        currentCard: null,
        isTimerRunning: false,
        pendingReviews: [...state.pendingReviews, newReview],
        logs: [`(TANTANGAN) ${groupName} mensubmit jawaban. Menunggu evaluasi Guru...`, ...state.logs]
      };
    }),

    gradeSubjektif: (reviewId, score) => syncSet((state) => {
      const review = state.pendingReviews.find(r => r.id === reviewId);
      if (!review) return {};

      // Removed automatic movement reward for TANTANGAN
      const stepsToMove = 0;
      
      const newGroups = state.groups.map(g => {
        if (g.id !== review.groupId) return g;
        
        let targetPos = g.position;
        if (targetPos === 0) {
           targetPos = Math.max(1, stepsToMove);
        } else {
           targetPos = ((g.position + stepsToMove - 1 + 30) % 30) + 1;
        }

        return { ...g, score: g.score + score, position: targetPos };
      });
      
      const cleanedReviews = state.pendingReviews.filter(r => r.id !== reviewId);
      
      const logMsg = `Guru menilai jawaban ${review.groupName}: ${score}/${review.maxPoints} poin.`;

      // Auto next turn after grading
      setTimeout(() => {
         get().nextTurn();
      }, 2000);

      return {
        groups: newGroups,
        pendingReviews: cleanedReviews,
        lastResult: {
          type: score >= review.maxPoints ? 'SUCCESS' : score > 0 ? 'NEUTRAL' : 'FAILURE',
          title: score >= review.maxPoints ? 'SEMPURNA!' : score > 0 ? 'BAGUS!' : 'KURANG TEPAT!',
          message: `Nilai: ${score}/${review.maxPoints} poin.`,
          points: score,
          groupName: review.groupName
        },
        logs: [logMsg, ...state.logs]
      };
    }),

    nextTurn: () => syncSet((state) => {
      if (state.groups.length === 0) return {};

      // Logika Sanksi (Lewat giliran) -> reset ke active
      const currentActive = state.groups[state.activeGroupIndex];
      let updatedGroups = [...state.groups];
      if (currentActive?.status === 'SKIP_NEXT') {
         updatedGroups = updatedGroups.map(g => g.id === currentActive.id ? { ...g, status: 'ACTIVE' } : g);
      }

      const nextIndex = (state.activeGroupIndex + 1) % state.groups.length;
      
      return { 
        groups: updatedGroups,
        activeGroupIndex: nextIndex,
        currentTurn: state.currentTurn + 1,
        currentCard: null,
        timer: 0,
        isTimerRunning: false,
        lastResult: null
      };
    }),

    rollDice: () => {
      const state = get();
      if (state.isRolling || state.isMoving) return;

      const dice = Math.floor(Math.random() * 6) + 1;

      // 1. Mulai animasi dadu - Sinkronkan ke semua client
      syncSet({
        isRolling: true,
        diceValue: dice,
        logs: [`${state.groups[state.activeGroupIndex].name} melempar dadu...`, ...state.logs],
      });

      // 2. Berhenti bergulir dan update posisi secara ATOMIK setelah 1.5 detik
      setTimeout(() => {
        const currentState = get();
        const activeIdx = currentState.activeGroupIndex;
        const currentPos = currentState.groups[activeIdx].position;
        
        // Loop logic 1-30:
        // if 0 -> just dice
        // if > 0 -> ((pos + dice - 1) % 30) + 1
        const targetPos = currentPos === 0 ? dice : ((currentPos + dice - 1) % 30) + 1;
        
        // Update posisi secara langsung di Store (Hanya satu kali sinkronisasi)
        syncSet({ 
          isRolling: false, 
          isMoving: true,
          groups: currentState.groups.map((g, i) => 
            i === activeIdx ? { ...g, position: targetPos } : g
          )
        });

        // 3. Berikan waktu untuk UI melakukan animasi "melompat" sebelum membuka kartu
        // Estimasi: 500ms per petak + buffer 500ms
        const animationDuration = (dice * 500) + 500;
        
        setTimeout(() => {
          // Hanya active player yang men-trigger aksi petak / penarikan kartu
          if (get().myGroupName === state.groups[activeIdx].name || (state.myGroupName === null && typeof window !== 'undefined')) {
            syncSet({ isMoving: false });
            
            const finalType = getTileTypeAt(targetPos);
            if (finalType === "SKIP") {
              syncSet((s) => ({
                logs: [`${s.groups[s.activeGroupIndex].name} mendarat di petak SKIP!`, ...s.logs],
              }));
              setTimeout(() => get().nextTurn(), 1000);
            } else {
              get().drawCard(finalType as QuestionType);
            }
          } else {
             // Observer hanya mematikan flag isMoving lokal
             set({ isMoving: false });
          }
        }, animationDuration);

      }, 1500);
    },

    executeMovement: () => {
      /* Diprepsiasi: Logika gerakan sekarang ditangani secara visual di UI */
    },

    decrementTimer: () => {
      const state = get();
      // Handle Card Timer timeout (Auto-Wrong)
      if (state.timer <= 0 && state.isTimerRunning) {
        const activeG = state.groups[state.activeGroupIndex];
        if (!activeG) return;

        if (state.currentCard?.type === 'DASAR') {
          get().submitAnswerObjektif(activeG.id, "WAKTU HABIS");
        } else if (state.currentCard?.type === 'TANTANGAN') {
          get().submitAnswerSubjektif(activeG.id, "(WAKTU HABIS)");
        } else {
          syncSet({ isTimerRunning: false });
        }
      }
    },

    clearLastResult: () => {
      syncSet({ lastResult: null });
    }

  };
});
