import { Server, Socket } from "socket.io";
// Simplified in-memory store for game rooms to replace BroadcastChannel
// Usually in production we'd use Redis for this volatile state.

interface ActiveRoom {
  config: { turnDurationSec: number; maxGroups: number };
  groups: any[];
  activeGroupIndex: number;
  timer: number;
  isTimerRunning: boolean;
  gameStatus: 'IDLE' | 'PLAYING' | 'FINISHED';
  currentTurn: number;
  winner: any | null;
  currentCard: any | null;
  pendingReviews: any[];
  intervalId?: NodeJS.Timeout;
}

const activeRooms = new Map<string, ActiveRoom>();

export function handleSocketEvents(io: Server, socket: Socket) {
  
  socket.on("room:join", (data: { roomCode: string, groupName: string, role?: string }) => {
    socket.join(data.roomCode);
    console.log(`Socket ${socket.id} joined ${data.roomCode} as ${data.role || 'siswa'}`);
    
    // Initialize room if not exists
    if (!activeRooms.has(data.roomCode)) {
      activeRooms.set(data.roomCode, {
        roomConfig: { turnDurationSec: 30, maxGroups: 6 },
        groups: [],
        activeGroupIndex: 0,
        timer: 30,
        isTimerRunning: false,
        gameStatus: 'LOBBY',
        currentTurn: 1,
        winner: null,
        currentCard: null,
        pendingReviews: []
      });
    }

    const room = activeRooms.get(data.roomCode)!;

    // Add group if role is siswa
    if (data.role !== 'guru' && data.groupName) {
      const maxG = room.roomConfig?.maxGroups || room.config?.maxGroups || 6;
      if (room.groups.length < maxG && !room.groups.find((g: any) => g.name === data.groupName)) {
        room.groups.push({
          id: `g-${Date.now()}`,
          name: data.groupName,
          score: 0,
          position: 0,
          status: 'WAITING'
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

    room.gameStatus = 'PLAYING';
    room.isTimerRunning = true;
    room.timer = room.roomConfig?.turnDurationSec || room.config?.turnDurationSec || 30;
    
    // Start interval safely retrieving fresh room
    if (room.intervalId) clearInterval(room.intervalId);
    room.intervalId = setInterval(() => {
      const liveRoom = activeRooms.get(roomCode);
      if (!liveRoom) return;
      
      if (liveRoom.isTimerRunning && liveRoom.timer > 0) {
        liveRoom.timer--;
        io.to(roomCode).emit("game:timer", liveRoom.timer);
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
    const existing = activeRooms.get(data.roomCode) || {} as any;
    const merged = { ...existing, ...data.state };
    activeRooms.set(data.roomCode, merged);
    const { intervalId, ...mergedData } = merged;
    socket.to(data.roomCode).emit("game:state", mergedData);
  });

  socket.on("disconnect", () => {
     // Handle cleanup or timeout
  });
}
