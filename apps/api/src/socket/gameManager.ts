import { Server, Socket } from "socket.io";
// Simplified in-memory store for game rooms to replace BroadcastChannel
// Usually in production we'd use Redis for this volatile state.

interface ActiveRoom {
  roomConfig: { 
    gameDurationSec: number; 
    maxGroups: number;
    turnDurationDasar?: number;
    turnDurationTantangan?: number;
    turnDurationAksi?: number;
  };
  groups: any[];
  activeGroupIndex: number;
  timer: number; // For card/turn
  globalTimer: number; // For whole session
  isTimerRunning: boolean; // Card timer
  isGlobalTimerRunning: boolean; // Global session timer
  gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';
  currentTurn: number;
  winner: any | null;
  currentCard: any | null;
  pendingReviews: any[];
  logs: string[];
  countdown: number | null;
  intervalId?: NodeJS.Timeout;
}

const activeRooms = new Map<string, ActiveRoom>();

export function handleSocketEvents(io: Server, socket: Socket) {
  
  socket.on("room:join", (data: { roomCode: string, groupName: string, role?: string, roomConfig?: any }) => {
    socket.join(data.roomCode);
    console.log(`Socket ${socket.id} joined ${data.roomCode} as ${data.role || 'siswa'}`);
    
    // Initialize room if not exists
    if (!activeRooms.has(data.roomCode)) {
      activeRooms.set(data.roomCode, {
        roomConfig: data.roomConfig || { gameDurationSec: 600, maxGroups: 4 },
        groups: [],
        activeGroupIndex: 0,
        timer: 0,
        globalTimer: 600,
        isTimerRunning: false,
        isGlobalTimerRunning: false,
        gameStatus: 'LOBBY',
        currentTurn: 1,
        winner: null,
        currentCard: null,
        pendingReviews: [],
        logs: ["Room dibuat."],
        countdown: null
      });
    }

    const room = activeRooms.get(data.roomCode)!;

    // Add group if role is siswa
    if (data.role !== 'guru' && data.groupName) {
      const maxG = room.roomConfig?.maxGroups || 4;
      if (room.groups.length < maxG && !room.groups.find((g: any) => g.name === data.groupName)) {
        room.groups.push({
          id: `g-${Date.now()}`,
          name: data.groupName,
          score: 0,
          position: 0,
          status: 'WAITING',
          avatar: (data as any).avatar,
          color: (data as any).color
        });
        
        if (room.logs) {
          room.logs = [`${data.groupName} bergabung ke room.`, ...room.logs];
        } else {
          room.logs = [`${data.groupName} bergabung ke room.`];
        }
      }
    }

    // Broadcast updated state (omit intervalId which causes circular JSON / stack size error)
    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", roomData);
  });

  socket.on("game:start", (roomCode: string) => {
    const room = activeRooms.get(roomCode);
    if (!room) return;

    room.gameStatus = 'LOBBY'; // Keep in lobby during countdown
    room.countdown = 3; 
    room.isGlobalTimerRunning = false;
    room.timer = 0;
    room.isTimerRunning = false;
    
    // Start interval safely retrieving fresh room
    if (room.intervalId) clearInterval(room.intervalId);
    room.intervalId = setInterval(() => {
      const liveRoom = activeRooms.get(roomCode);
      if (!liveRoom) return;
      
      let updated = false;

      // Tick Countdown
      if (liveRoom.countdown !== null && liveRoom.countdown > 0) {
        liveRoom.countdown--;
        updated = true;
      } else if (liveRoom.countdown === 0) {
        liveRoom.countdown = null;
        liveRoom.gameStatus = 'PLAYING';
        liveRoom.isGlobalTimerRunning = true;
        liveRoom.globalTimer = liveRoom.roomConfig?.gameDurationSec || 600;
        updated = true;
      }

      // Tick Global Timer
      if (liveRoom.isGlobalTimerRunning && liveRoom.globalTimer > 0) {
        liveRoom.globalTimer--;
        updated = true;
      }

      // Tick Card Timer
      if (liveRoom.isTimerRunning && liveRoom.timer > 0) {
        liveRoom.timer--;
        updated = true;
      }

      if (updated) {
        io.to(roomCode).emit("game:timer_sync", {
          timer: liveRoom.timer,
          globalTimer: liveRoom.globalTimer,
          countdown: liveRoom.countdown
        });
        
        // Also sync state if status changed
        if (liveRoom.gameStatus === 'PLAYING' && liveRoom.countdown === null) {
           const { intervalId, ...roomData } = liveRoom;
           io.to(roomCode).emit("game:state", roomData);
        }
      }

      // Auto end game if global timer reaches 0
      if (liveRoom.globalTimer <= 0 && liveRoom.gameStatus === 'PLAYING') {
        liveRoom.gameStatus = 'FINISHED';
        // In a real app we'd calculate winner here or let frontend do it on next sync
        const { intervalId, ...roomData } = liveRoom;
        io.to(roomCode).emit("game:state", roomData);
      }
    }, 1000);

    const { intervalId: ignored, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  });

  socket.on("game:drawCard", (data: { roomCode: string, card: any }) => {
    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    room.currentCard = data.card;
    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", roomData);
  });

  socket.on("teacher:grade", (data: { roomCode: string, reviewId: string, score: number }) => {
    // In complete version we apply score to the group here and trigger next turn
    const room = activeRooms.get(data.roomCode);
    if (!room) return;
    
    const reviewIndex = room.pendingReviews.findIndex((r) => r.id === data.reviewId);
    if (reviewIndex !== -1) {
      const review = room.pendingReviews[reviewIndex];
      const g = room.groups.find(x => x.id === review.groupId);
      if (g) {
        g.score += data.score;
        // Move position mock logic
        g.position += Math.floor(data.score / 10);
      }
      room.pendingReviews.splice(reviewIndex, 1);
      room.currentCard = null; // Card is fulfilled
      // Trigger Next Turn mechanism here
    }
    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", roomData);
  });

  socket.on("game:sync_state", (data: { roomCode: string, state: any }) => {
    const existing = activeRooms.get(data.roomCode);
    if (!existing) return;

    const merged = { ...existing, ...data.state };
    
    // Safety: If game ends via sync, stop the server-side timer intervals
    if (data.state.gameStatus === 'FINISHED' && existing.intervalId) {
      clearInterval(existing.intervalId);
      merged.intervalId = undefined;
      merged.isGlobalTimerRunning = false;
      merged.isTimerRunning = false;
    }

    activeRooms.set(data.roomCode, merged);
    const { intervalId, ...mergedData } = merged;
    socket.to(data.roomCode).emit("game:state", mergedData);
  });

  socket.on("disconnect", () => {
     // Handle cleanup or timeout
  });
}
