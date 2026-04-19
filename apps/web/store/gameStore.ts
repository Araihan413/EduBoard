import { create } from 'zustand';

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
}

export interface RoomConfig {
  turnDurationSec: number;
  maxGroups: number;
}

export interface SessionHistory {
  id: string;
  date: string;
  roomCode: string;
  winner: string;
  winnerScore: number;
  totalGroups: number;
}

interface GameState {
  gameStatus: GameStatus;
  roomCode: string;
  roomConfig: RoomConfig;
  groups: Group[];
  activeGroupIndex: number;
  currentTurn: number;
  timer: number;
  isTimerRunning: boolean;
  currentCard: QuestionCard | null;
  
  questions: QuestionCard[];
  pendingReviews: PendingReview[];
  sessionHistory: SessionHistory[];
  
  winner: Group | null;
  logs: string[];

  // Actions - Room & Sesi
  createRoom: (config: RoomConfig) => void;
  joinRoom: (name: string) => void;
  startGame: () => void;
  endGame: () => void;
  resetToIdle: () => void;

  // Actions - Pertanyaan
  addQuestion: (q: Omit<QuestionCard, 'id'>) => void;
  updateQuestion: (id: string, q: Partial<QuestionCard>) => void;
  deleteQuestion: (id: string) => void;

  // Actions - Mekanik Permainan
  drawCard: () => void;
  submitAnswerObjektif: (groupId: string, answer: string) => void;
  submitAnswerSubjektif: (groupId: string, answerText: string) => void;
  gradeSubjektif: (reviewId: string, score: number) => void;
  nextTurn: () => void;
  decrementTimer: () => void;
  
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

let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined') {
  syncChannel = new BroadcastChannel('eduboard_sync');
}

export const useGameStore = create<GameState>((set, get) => {
  
  const syncSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => {
    set((state) => {
      const nextState = typeof partial === 'function' ? partial(state) : partial;
      if (syncChannel) {
        syncChannel.postMessage(nextState);
      }
      return nextState;
    });
  };

  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      set(event.data);
    };
  }

  const checkWinner = (groups: Group[], currentState: GameState): Partial<GameState> | null => {
    const didWin = groups.find(g => g.position >= 14);
    if (didWin) {
      const historyItem: SessionHistory = {
        id: `ses-${Date.now()}`,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        roomCode: currentState.roomCode,
        winner: didWin.name,
        winnerScore: didWin.score,
        totalGroups: groups.length
      };
      
      return {
        groups,
        currentCard: null,
        isTimerRunning: false,
        gameStatus: 'FINISHED',
        winner: didWin,
        sessionHistory: [historyItem, ...currentState.sessionHistory],
        logs: [`${didWin.name} telah MENCAPAI GARIS FINISH!`, ...currentState.logs]
      };
    }
    return null;
  }

  return {
    gameStatus: 'IDLE',
    roomCode: '',
    roomConfig: { turnDurationSec: 30, maxGroups: 4 },
    groups: [],
    activeGroupIndex: 0,
    currentTurn: 1,
    timer: 0,
    isTimerRunning: false,
    currentCard: null,
    
    questions: DUMMY_QUESTIONS,
    pendingReviews: [],
    sessionHistory: [
      { id: 'old1', date: '12 April 2026, 09:00', roomCode: 'X99ABC', winner: 'Kelompok Khadijah', winnerScore: 120, totalGroups: 4 }
    ],
    
    winner: null,
    logs: ["Sistem sedia... menunggu konfigurasi room."],

    setStateFromSync: (newState) => set(newState),

    createRoom: (config) => syncSet((state) => {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      return {
        gameStatus: 'LOBBY',
        roomCode: newCode,
        roomConfig: config,
        groups: [],
        winner: null,
        logs: [`Room ${newCode} dibuat. Menunggu peserta bergabung...`, ...state.logs]
      };
    }),

    joinRoom: (name: string) => syncSet((state) => {
      if (state.groups.length >= state.roomConfig.maxGroups) return {}; 
      return {
        groups: [...state.groups, {
          id: `g${Date.now()}`,
          name: name,
          score: 0,
          position: 0,
          status: 'WAITING'
        }],
        logs: [`${name} bergabung ke room.`, ...state.logs]
      }
    }),

    startGame: () => syncSet((state) => {
      const activeGroups = state.groups.map(g => ({ ...g, status: 'ACTIVE' as GroupStatus }));
      return {
        gameStatus: 'PLAYING',
        groups: activeGroups,
        activeGroupIndex: 0,
        currentTurn: 1,
        timer: state.roomConfig.turnDurationSec,
        isTimerRunning: false,
        logs: ["Permainan dimulai!", ...state.logs]
      };
    }),

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
           totalGroups: state.groups.length
        });
      }

      return {
        gameStatus: 'FINISHED',
        winner,
        isTimerRunning: false,
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
      questions: [{ ...q, id: `q-${Date.now()}` }, ...state.questions]
    })),

    updateQuestion: (id, updatedQ) => syncSet((state) => ({
      questions: state.questions.map(q => q.id === id ? { ...q, ...updatedQ } : q)
    })),

    deleteQuestion: (id) => syncSet((state) => ({
      questions: state.questions.filter(q => q.id !== id)
    })),

    drawCard: () => syncSet((state) => {
      const randIdx = Math.floor(Math.random() * state.questions.length);
      const card = state.questions[randIdx];
      let t = state.roomConfig.turnDurationSec;
      if (card.type === 'TANTANGAN') t = t + 30; // Tantangan lebih lama
      if (card.type === 'AKSI') t = 10;
      
      return { 
        currentCard: card,
        timer: t,
        isTimerRunning: true,
        logs: [`${state.groups[state.activeGroupIndex]?.name} mengambil Kartu ${card.type}.`, ...state.logs]
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
          stepsToMove = 1;
          logMsg = `(DASAR) ${groupName} Benar! +${earnedPoints} poin & maju 1 petak.`;
        } else {
          // PRD: Sanksi Jawaban Salah
          stepsToMove = -1;
          logMsg = `(DASAR) ${groupName} SALAH! Mundur 1 petak sebagai sanksi.`;
        }
      } else if (card.type === 'AKSI') {
        earnedPoints = card.points;
        stepsToMove = card.points > 0 ? 2 : -2;
        logMsg = `(AKSI) ${groupName} mengeksekusi instruksi aksi.`;
      }
      
      const newGroups = state.groups.map(g => 
        g.id === groupId ? { ...g, score: g.score + earnedPoints, position: Math.max(0, g.position + stepsToMove), status: newGroupStatus } : g
      );

      const winState = checkWinner(newGroups, state);
      if (winState) return winState;

      return {
        groups: newGroups,
        currentCard: null,
        isTimerRunning: false,
        logs: [logMsg, ...state.logs]
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
        maxPoints: card.points
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

      // Calculate steps. Rule logic: > 50% max points -> move forward 1.
      const stepsToMove = score >= (review.maxPoints / 2) ? 1 : 0;
      
      const newGroups = state.groups.map(g => 
        g.id === review.groupId ? { ...g, score: g.score + score, position: Math.max(0, g.position + stepsToMove) } : g
      );
      
      const cleanedReviews = state.pendingReviews.filter(r => r.id !== reviewId);
      
      const logMsg = `Guru menilai jawaban ${review.groupName}: ${score}/${review.maxPoints} poin.`;

      const winState = checkWinner(newGroups, state);
      if (winState) return { ...winState, pendingReviews: cleanedReviews };

      return {
        groups: newGroups,
        pendingReviews: cleanedReviews,
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
        timer: state.roomConfig.turnDurationSec,
        isTimerRunning: false
      };
    }),

    decrementTimer: () => syncSet((state) => {
      const newTime = state.timer - 1;
      if (newTime <= 0) {
        const activeG = state.groups[state.activeGroupIndex];
        const card = state.currentCard;

        if (card && card.type === 'TANTANGAN') {
          // If time expires on subjective, auto submit empty
          get().submitAnswerSubjektif(activeG.id, "(WAKTU HABIS - Tidak Ada Jawaban)");
          return {}; // handled by submitAnswerSubjektif
        }

        // Auto Wrong for normal card
        if (card && card.type === 'DASAR') {
           get().submitAnswerObjektif(activeG.id, "WAKTU HABIS");
           return {};
        }

        return {
          timer: 0,
          isTimerRunning: false,
          currentCard: null,
          logs: [`Waktu habis untuk giliran ini!`, ...state.logs]
        };
      }
      return { timer: newTime };
    }),

  };
});
