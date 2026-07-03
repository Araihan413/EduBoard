import { Server, Socket } from "socket.io";
import { prisma } from "@repo/db";

interface ActiveRoom {
  roomConfig: { 
    gameDurationSec: number; 
    maxGroups: number;
    turnDurationDasar?: number;
    turnDurationTantangan?: number;
    turnDurationPemahaman?: number;
  };
  groups: (any & { isOffline?: boolean })[];
  activeGroupIndex: number;
  timer: number;
  globalTimer: number;
  isTimerRunning: boolean;
  isGlobalTimerRunning: boolean;
  gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';
  currentTurn: number;
  winner: any | null;
  currentCard: any | null;
  pendingReviews: any[];
  logs: string[];
  countdown: number | null;
  questions?: any[];
  intervalId?: NodeJS.Timeout;
  stateSeq?: number;
  emptySince?: number;

  // Server-Authoritative FSM
  phase?: 'WAITING_FOR_ROLL' | 'ROLLING' | 'MOVING' | 'CHOOSING_PATH' | 'ACTIVE_QUESTION' | 'STAR_SPINNING' | 'TURN_RESOLVED';
  transitionTimer?: number;
  transitionEndTime?: number;
  diceValue?: number;
  isRolling?: boolean;
  isMoving?: boolean;
  hasRolled?: boolean;
  isChoosingPath?: boolean;
  visualPath?: number[];
  stepsRemaining?: number;
  availablePaths?: number[];
  animatingPionId?: string | null;
  starSpinResult?: string | null;
  isSpinningStar?: boolean;
  isSpinAnimating?: boolean;
  lastResult?: any;
}

interface TileConfig {
  id: number;
  type: 'DASAR' | 'TANTANGAN' | 'PEMAHAMAN' | 'SKIP' | 'STAR';
  x: number;
  y: number;
  rotation: number;
  next: number[];
}

const TILE_GRAPH: TileConfig[] = [
  { id: 0, type: "DASAR", x: -8.4, y: -6.07, rotation: 0, next: [1] },
  { id: 1, type: "STAR", x: -6.7, y: -5.8, rotation: 0, next: [2] },
  { id: 2, type: "DASAR", x: -5.2, y: -6.1, rotation: 0, next: [3] },
  { id: 3, type: "PEMAHAMAN", x: -3.65, y: -6.2, rotation: 0, next: [4] },
  { id: 4, type: "TANTANGAN", x: -2.1, y: -6.2, rotation: 0, next: [5] },
  { id: 5, type: "STAR", x: -0.55, y: -6.2, rotation: 0, next: [6, 35] },
  { id: 6, type: "DASAR", x: 1.38, y: -6.15, rotation: 0, next: [7] },
  { id: 7, type: "TANTANGAN", x: 2.9, y: -6.2, rotation: 0, next: [8] },
  { id: 8, type: "SKIP", x: 4.4, y: -6.2, rotation: 0, next: [9] },
  { id: 9, type: "DASAR", x: 6, y: -6.2, rotation: 0, next: [10] },
  { id: 10, type: "PEMAHAMAN", x: 7.6, y: -6, rotation: 0, next: [11] },
  { id: 11, type: "TANTANGAN", x: 7.6, y: -4.6, rotation: 0, next: [12] },
  { id: 12, type: "DASAR", x: 7.6, y: -3.2, rotation: 0, next: [13] },
  { id: 13, type: "DASAR", x: 7.6, y: -1.7, rotation: 0, next: [14] },
  { id: 14, type: "STAR", x: 7.65, y: -0.2, rotation: 0, next: [15, 39] },
  { id: 15, type: "TANTANGAN", x: 7.8, y: 1.8, rotation: 0, next: [16] },
  { id: 16, type: "DASAR", x: 8, y: 3.45, rotation: 0, next: [17] },
  { id: 17, type: "PEMAHAMAN", x: 8.05, y: 4.95, rotation: 0, next: [18] },
  { id: 18, type: "TANTANGAN", x: 7.4, y: 6.4, rotation: 0, next: [19] },
  { id: 19, type: "PEMAHAMAN", x: 5.8, y: 6.65, rotation: 0, next: [20] },
  { id: 20, type: "DASAR", x: 4.2, y: 6.6, rotation: 0, next: [21] },
  { id: 21, type: "DASAR", x: 2.67, y: 6.25, rotation: 0, next: [22] },
  { id: 22, type: "SKIP", x: 1.19, y: 5.82, rotation: 0, next: [23] },
  { id: 23, type: "TANTANGAN", x: -0.36, y: 5.2, rotation: 0, next: [24] },
  { id: 24, type: "STAR", x: -1.7, y: 4.35, rotation: 0, next: [25, 47] },
  { id: 25, type: "TANTANGAN", x: -3.7, y: 5, rotation: 0, next: [26] },
  { id: 26, type: "PEMAHAMAN", x: -4.1, y: 6.6, rotation: 0, next: [27] },
  { id: 27, type: "SKIP", x: -5.7, y: 6.3, rotation: 0, next: [28] },
  { id: 28, type: "DASAR", x: -7.1, y: 5.55, rotation: 0, next: [29] },
  { id: 29, type: "PEMAHAMAN", x: -7.75, y: 4, rotation: 0, next: [30] },
  { id: 30, type: "TANTANGAN", x: -7.85, y: 2.4, rotation: 0, next: [31] },
  { id: 31, type: "SKIP", x: -7.78, y: 0.65, rotation: 0, next: [32] },
  { id: 32, type: "DASAR", x: -7.6, y: -1.15, rotation: 0, next: [33] },
  { id: 33, type: "TANTANGAN", x: -7.75, y: -2.9, rotation: 0, next: [34] },
  { id: 34, type: "PEMAHAMAN", x: -7.6, y: -4.4, rotation: 0, next: [1] },
  { id: 35, type: "PEMAHAMAN", x: 0.8, y: -4.6, rotation: 0, next: [36] },
  { id: 36, type: "STAR", x: 1.9, y: -3.25, rotation: 0, next: [37, 43] },
  { id: 37, type: "PEMAHAMAN", x: 3.06, y: -1.5, rotation: 0, next: [38] },
  { id: 38, type: "DASAR", x: 4, y: -0.2, rotation: 0, next: [40] },
  { id: 39, type: "DASAR", x: 6.4, y: 0.9, rotation: 0, next: [40] },
  { id: 40, type: "TANTANGAN", x: 4.7, y: 1.35, rotation: 0, next: [41] },
  { id: 41, type: "DASAR", x: 3.1, y: 2.6, rotation: 0, next: [42] },
  { id: 42, type: "PEMAHAMAN", x: 1.95, y: 4.2, rotation: 0, next: [22] },
  { id: 43, type: "TANTANGAN", x: 1.5, y: -1.25, rotation: 0, next: [44] },
  { id: 44, type: "PEMAHAMAN", x: 0.3, y: -0.1, rotation: 0, next: [45] },
  { id: 45, type: "DASAR", x: -1.15, y: 0.6, rotation: 0, next: [46] },
  { id: 46, type: "DASAR", x: -2.65, y: 1.15, rotation: 0, next: [48] },
  { id: 47, type: "PEMAHAMAN", x: -3.25, y: 3, rotation: 0, next: [48] },
  { id: 48, type: "SKIP", x: -4.18, y: 1.7, rotation: 0, next: [49] },
  { id: 49, type: "DASAR", x: -5.2, y: 0.6, rotation: 0, next: [50] },
  { id: 50, type: "PEMAHAMAN", x: -6.2, y: -0.6, rotation: 0, next: [32] },
];

function getTileById(id: number): TileConfig {
  const tile = TILE_GRAPH.find(t => t.id === id);
  return tile || TILE_GRAPH[0];
}

function calculateSubPath(fromTileId: number, steps: number): { path: number[], stepsRemaining: number } {
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
      break;
    }

    const nextId = nextIds[0];
    path.push(nextId);
    currentId = nextId;
    remaining--;

    const nextTile = getTileById(currentId);
    if (nextTile.next && nextTile.next.length > 1 && remaining > 0) {
      break;
    }
  }

  return { path, stepsRemaining: remaining };
}

const activeRooms = new Map<string, ActiveRoom>();
const socketToUser = new Map<string, { roomCode: string, groupName: string, role: string }>();

interface RoomDeck {
  dasar: any[];
  tantangan: any[];
  pemahaman: any[];
}

const roomDecks = new Map<string, RoomDeck>();

const ALL_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#64748b"  // Slate
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Auto-cleanup stale/abandoned rooms with zero active connections (Grace Period: 10 minutes)
setInterval(() => {
  const now = Date.now();
  const gracePeriod = 10 * 60 * 1000; // 10 menit toleransi
  
  for (const [roomCode, room] of activeRooms.entries()) {
    const activeSockets = Array.from(socketToUser.values()).filter(u => u.roomCode === roomCode);
    
    if (activeSockets.length === 0) {
      if (!room.emptySince) {
        room.emptySince = now;
      } else if (now - room.emptySince >= gracePeriod) {
        console.log(`[CLEANUP] Menghapus room terbengkalai (tidak aktif selama 10 menit): ${roomCode}`);
        if (room.intervalId) clearInterval(room.intervalId);
        activeRooms.delete(roomCode);
        roomDecks.delete(roomCode);
      }
    } else {
      if (room.emptySince) {
        delete room.emptySince;
      }
    }
  }
}, 60 * 1000); // Periksa setiap menit

export function handleSocketEvents(io: Server, socket: Socket) {
  
  socket.on("room:leave", async (data: { roomCode: string, groupName: string }) => {
    const room = activeRooms.get(data.roomCode);
    if (room) {
      if (room.gameStatus === 'LOBBY') {
        const normalizedName = data.groupName.trim().toLowerCase();
        room.groups = room.groups.filter((g: any) => g.name.trim().toLowerCase() !== normalizedName);
        await prisma.group.deleteMany({
          where: {
            room: { code: data.roomCode },
            name: { equals: data.groupName, mode: 'insensitive' }
          }
        });
      } else {
        // PLAYING: Mark as SURRENDERED instead of removing
        const group = room.groups.find(g => g.name === data.groupName);
        if (group) {
          group.status = 'SURRENDERED';
          await prisma.group.update({
            where: { id: group.id },
            data: { status: 'SURRENDERED' as any }
          }).catch(() => { /* DB update failed, in-memory state is authoritative */ });
          room.logs = [`${data.groupName} menyerah dari permainan.`, ...room.logs];
          
          // Check if any non-surrendered players are left
          const remainingPlayers = room.groups.filter(g => g.status !== 'SURRENDERED');
          if (remainingPlayers.length === 0) {
            await finishGame(data.roomCode);
          } else {
            // Jika pemain yang menyerah adalah yang sedang giliran, otomatis lanjut ke pemain berikutnya
            const activeGroup = room.groups[room.activeGroupIndex];
            if (activeGroup && activeGroup.name === data.groupName) {
              let nextIndex = (room.activeGroupIndex + 1) % room.groups.length;
              let searchCount = 0;
              
              while (room.groups[nextIndex].status === 'SURRENDERED' && searchCount < room.groups.length) {
                nextIndex = (nextIndex + 1) % room.groups.length;
                searchCount++;
              }
              
              room.activeGroupIndex = nextIndex;
              room.currentTurn += 1;
              room.currentCard = null;
              room.timer = 0;
              room.isTimerRunning = false;
              room.logs = [`Giliran dialihkan ke ${room.groups[nextIndex].name} karena ${data.groupName} menyerah.`, ...room.logs];
              
              try {
                await prisma.room.update({
                  where: { code: data.roomCode },
                  data: { 
                    activeGroupIndex: nextIndex,
                    currentTurn: room.currentTurn
                  }
                });
              } catch (err) {
                console.error("Gagal update turn saat surrender:", err);
              }
            }
          }
        }
      }
      
      const { intervalId, ...roomData } = room;
      io.to(data.roomCode).emit("game:state", roomData);
      socket.leave(data.roomCode);
      socketToUser.delete(socket.id);
    }
  });

  socket.on("disconnect", async () => {
    const userData = socketToUser.get(socket.id);
    if (!userData) return;

    const { roomCode, groupName, role } = userData;
    
    // Check if there are other active sockets for this same student/group or guru
    const otherSockets = Array.from(socketToUser.entries()).filter(([id, data]) => 
      id !== socket.id && data.roomCode === roomCode && (groupName ? data.groupName === groupName : data.role === 'guru')
    );

    const room = activeRooms.get(roomCode);

    if (room && otherSockets.length === 0) {
      if (role === 'siswa' && groupName) {
        const group = room.groups.find(g => g.name === groupName);
        if (group) {
          // In LOBBY, we don't mark as offline to avoid refresh issues
          // Offline only matters when the game is ACTIVE
          if (room.gameStatus !== 'LOBBY') {
            group.isOffline = true;
            room.logs = [`${groupName} terputus (Offline).`, ...room.logs];
          }
        }
        io.to(roomCode).emit("game:state", { roomCode, groups: room.groups, logs: room.logs });
      }
    }
    
    socketToUser.delete(socket.id);

    // Tandai waktu kosong jika tidak ada lagi socket aktif di room ini
    const liveRoom = activeRooms.get(roomCode);
    if (liveRoom) {
      const activeSockets = Array.from(socketToUser.values()).filter(u => u.roomCode === roomCode);
      if (activeSockets.length === 0) {
        liveRoom.emptySince = Date.now();
        console.log(`[DISCONNECT] Room ${roomCode} kosong, masa tenggang dimulai.`);
      }
    }
  });

  socket.on("room:cancel", async (roomCode: string) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.role !== 'guru' || sender.roomCode !== roomCode) {
      socket.emit("error", { message: "Akses ditolak: Anda tidak memiliki wewenang Guru." });
      return;
    }

    const room = activeRooms.get(roomCode);
    if (room) {
      if (room.intervalId) {
        clearInterval(room.intervalId);
      }
      try {
        await prisma.room.update({
          where: { code: roomCode },
          data: { status: 'CANCELLED' }
        });
        io.to(roomCode).emit("room:cancelled", { roomCode });
      } catch (err) {
        console.error("Gagal batalkan room di DB:", err);
      } finally {
        activeRooms.delete(roomCode);
        roomDecks.delete(roomCode);
      }
    }
  });
  
  socket.on("room:kick", async (data: { roomCode: string, groupName: string }) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.role !== 'guru' || sender.roomCode !== data.roomCode) {
      socket.emit("error", { message: "Akses ditolak: Anda tidak memiliki wewenang Guru." });
      return;
    }

    const room = activeRooms.get(data.roomCode);
    if (room) {
      if (room.gameStatus === 'LOBBY') {
        const normalizedName = data.groupName.trim().toLowerCase();
        room.groups = room.groups.filter((g: any) => g.name.trim().toLowerCase() !== normalizedName);
        
        // Find and disconnect the kicked group socket
        const targetSocketEntry = Array.from(socketToUser.entries()).find(([_, u]) => 
          u.roomCode === data.roomCode && 
          u.role === 'siswa' && 
          u.groupName && 
          u.groupName.trim().toLowerCase() === normalizedName
        );

        if (targetSocketEntry) {
          const [targetSocketId] = targetSocketEntry;
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit("error", { message: "Anda telah dikeluarkan dari ruangan oleh Guru." });
            targetSocket.leave(data.roomCode);
          }
          socketToUser.delete(targetSocketId);
        }

        await prisma.group.deleteMany({
          where: {
            room: { code: data.roomCode },
            name: { equals: data.groupName, mode: 'insensitive' }
          }
        });

        room.logs = [`${data.groupName} dikeluarkan oleh Guru.`, ...room.logs];

        const { intervalId, ...roomData } = room;
        io.to(data.roomCode).emit("game:state", { ...roomData, roomCode: data.roomCode });
      }
    }
  });
  
  socket.on("room:join", async (data: { roomCode: string, groupName: string, role?: string, roomConfig?: any, avatar?: string, color?: string, token?: string }) => {
    
    // 1. Verify Guru Identity if role is 'guru'
    if (data.role === 'guru') {
      if (!data.token) {
        socket.emit("error", { message: "Akses ditolak: Token autentikasi tidak ditemukan." });
        return;
      }
      
      try {
        const { supabase } = await import('../supabaseAuth');
        const { data: authData, error } = await supabase.auth.getUser(data.token);
        
        if (error || !authData.user) {
          socket.emit("error", { message: "Akses ditolak: Token autentikasi tidak valid." });
          return;
        }

        const dbRoomCheck = await prisma.room.findUnique({
          where: { code: data.roomCode },
          select: { guruId: true }
        });

        if (dbRoomCheck && dbRoomCheck.guruId !== authData.user.id) {
          socket.emit("error", { message: "Akses ditolak: Anda bukan pemilik ruang ini." });
          return;
        }
      } catch (err) {
        console.error("Gagal verifikasi token socket guru:", err);
        socket.emit("error", { message: "Gagal memverifikasi identitas Guru." });
        return;
      }
    }

    socket.join(data.roomCode);
    
    // Register socket mapping
    socketToUser.set(socket.id, { 
      roomCode: data.roomCode, 
      groupName: data.groupName, 
      role: data.role || 'siswa' 
    });

    if (!activeRooms.has(data.roomCode)) {
      try {
        const dbRoom = await prisma.room.findUnique({
          where: { code: data.roomCode },
          include: { groups: true, session: true }
        }) as any;

        if (dbRoom) {
          if (dbRoom.status === 'ENDED') {
            socket.emit("error", { message: "Ruang permainan ini sudah berakhir." });
            return;
          }
          activeRooms.set(data.roomCode, {
            roomConfig: data.roomConfig || { 
              gameDurationSec: dbRoom.durationMinutes * 60, 
              maxGroups: dbRoom.maxGroups 
            },
            groups: dbRoom.groups.map((g: any) => ({
              id: g.id,
              name: g.name,
              score: g.score,
              position: g.position,
              status: g.status,
              avatar: g.avatar,
              color: g.color,
              isOffline: false,
            })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
            gameStatus: dbRoom.status as any,
            currentTurn: dbRoom.currentTurn,
            activeGroupIndex: dbRoom.activeGroupIndex,
            timer: 0,
            globalTimer: dbRoom.durationMinutes * 60,
            isTimerRunning: false,
            isGlobalTimerRunning: dbRoom.status === 'ACTIVE',
            winner: null,
            currentCard: null,
            pendingReviews: dbRoom.session ? (await prisma.answer.findMany({
              where: { sessionId: dbRoom.session.id, scoreGiven: null },
              include: { group: true, question: true }
            })).map(a => ({
              id: `rev-${a.id}`,
              dbAnswerId: a.id,
              groupId: a.groupId,
              groupName: a.group.name,
              question: a.question.text,
              answer: a.answerText || "",
              points: a.question.points,
              answerKey: a.question.answerKey || null
            })) : [],
            logs: ["Sesi dipulihkan dari database."],
            countdown: null,
            stateSeq: 0
          });
        } else {
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
            countdown: null,
            stateSeq: 0
          });
        }
      } catch (err) {
        console.error("Gagal memulihkan room:", err);
      }
    }

    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    // Bersihkan tanda emptySince jika ada user yang masuk kembali
    if (room.emptySince) {
      delete room.emptySince;
    }

    if (data.role !== 'guru' && data.groupName) {
      const normalizedName = data.groupName.trim().toLowerCase();
      const existingGroup = room.groups.find((g: any) => g.name.trim().toLowerCase() === normalizedName);
      
      if (existingGroup) {
        // ─── SESI MULTI-TAB GUARD: Cegah dua tab aktif secara bersamaan ───────
        // Cari apakah sudah ada socket lain yang terdaftar untuk tim ini di room ini
        const oldSocketEntry = Array.from(socketToUser.entries()).find(([sid, u]) => 
          u.roomCode === data.roomCode && 
          u.role !== 'guru' &&
          u.groupName &&
          u.groupName.trim().toLowerCase() === normalizedName && 
          sid !== socket.id
        );

        if (oldSocketEntry) {
          const [oldSocketId] = oldSocketEntry;
          
          // Dapatkan instance socket lama dan kirimkan event supersede
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.emit("room:superseded", { 
              message: "Sesi Anda telah dibuka di tab atau perangkat lain." 
            });
            oldSocket.leave(data.roomCode);
          }
          socketToUser.delete(oldSocketId);
        }
        // ─────────────────────────────────────────────────────────────────────

        if (existingGroup.status === 'SURRENDERED') {
          socket.emit("error", { message: "Anda sudah menyerah dari permainan ini." });
          socket.leave(data.roomCode);
          socketToUser.delete(socket.id);
          return;
        }
        existingGroup.isOffline = false;
        
        // JANGAN menimpa avatar dan warna yang sudah terdaftar di server jika sudah ada.
        // Hanya isi jika data tersebut masih kosong (sebagai fallback).
        const oldAvatar = existingGroup.avatar;
        const oldColor = existingGroup.color;
        
        if (!existingGroup.avatar && data.avatar) {
          existingGroup.avatar = data.avatar;
        }
        if (!existingGroup.color && data.color) {
          const otherTakenColors = room.groups
            .filter((g: any) => g.id !== existingGroup.id)
            .map((g: any) => g.color)
            .filter(Boolean);
          
          let assignedColor = data.color;
          if (otherTakenColors.includes(assignedColor)) {
            const availableColors = ALL_COLORS.filter(c => !otherTakenColors.includes(c));
            if (availableColors.length > 0) {
              assignedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
            }
          }
          existingGroup.color = assignedColor;
        }
        
        room.logs = [`${existingGroup.name} kembali masuk.`, ...room.logs];
        
        // Update DB jika ada data kosong yang baru terisi
        if (existingGroup.avatar !== oldAvatar || existingGroup.color !== oldColor) {
          prisma.group.update({
            where: { id: existingGroup.id },
            data: { 
              avatar: existingGroup.avatar, 
              color: existingGroup.color 
            }
          }).catch(err => {
            // If update fails because record is missing, it's okay, we'll rely on memory
          });
        }

      } else {
        // ─── GUARD: Tolak bergabung jika permainan sudah berlangsung ──────────
        // Hanya grup yang sudah terdaftar sejak LOBBY yang boleh reconnect.
        // Ini mencegah "penumpang gelap" ikut di tengah permainan.
        if (room.gameStatus === 'PLAYING') {
          socket.emit("error", { 
            message: "Permainan sudah berlangsung. Hanya peserta yang terdaftar dari awal yang dapat masuk kembali." 
          });
          socket.leave(data.roomCode);
          socketToUser.delete(socket.id);
          return;
        }
        // ─────────────────────────────────────────────────────────────────────

        const maxG = room.roomConfig?.maxGroups || 4;
        if (room.groups.length >= maxG) {
          socket.emit("room:full", { message: `Maaf, ruangan ini sudah penuh (maks. ${maxG} kelompok).` });
          socket.leave(data.roomCode);
          socketToUser.delete(socket.id);
          return;
        }

        try {
          // 1. Immediately add a placeholder to memory to prevent race conditions
          // Use a temporary unique name to block other concurrent requests
          const tempId = `temp-${Date.now()}-${Math.random()}`;
          
          const takenColors = room.groups.map((g: any) => g.color).filter(Boolean);
          let assignedColor = data.color;

          if (!assignedColor || takenColors.includes(assignedColor)) {
            const availableColors = ALL_COLORS.filter(c => !takenColors.includes(c));
            if (availableColors.length > 0) {
              assignedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
            } else {
              assignedColor = data.color || ALL_COLORS[0];
            }
          }

          const newGroupEntry = {
            id: tempId,
            name: data.groupName,
            score: 0,
            position: 0,
            status: 'WAITING',
            avatar: data.avatar,
            color: assignedColor,
            isOffline: false
          };
          room.groups.push(newGroupEntry);
          room.groups.sort((a: any, b: any) => a.id.localeCompare(b.id));

          // 2. Now perform the slow DB operations
          const dbRoom = await prisma.room.findUnique({ where: { code: data.roomCode } });
          if (dbRoom) {
            const dbGroup = await prisma.group.create({
              data: {
                roomId: dbRoom.id,
                name: data.groupName,
                score: 0,
                position: 0,
                avatar: data.avatar,
                color: assignedColor
              }
            });

            // 3. Update the memory entry with the real DB ID
            newGroupEntry.id = dbGroup.id;
            room.groups.sort((a: any, b: any) => a.id.localeCompare(b.id));
            room.logs = [`${data.groupName} bergabung.`, ...room.logs];
          } else {
            // Rollback memory if room not found
            room.groups = room.groups.filter(g => g.id !== tempId);
          }
        } catch (err) {
          console.error("Gagal menyimpan group ke DB:", err);
          // Rollback if needed
          room.groups = room.groups.filter(g => g.id.toString().startsWith('temp-') === false);
        }
      }
    }


    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", { ...roomData, roomCode: data.roomCode });
  });
  socket.on("game:sync_state", async (data: { roomCode: string, state: any }) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.roomCode !== data.roomCode) return;

    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    // 1. If the client is signaling the game is FINISHED, use the dedicated finish logic
    if (data.state.gameStatus === 'FINISHED' && room.gameStatus !== 'FINISHED') {
      if (sender.role !== 'guru') return; // Hanya guru yang boleh menghentikan game
      return await finishGame(data.roomCode);
    }

    // 2. Jika pengirim adalah siswa, lakukan sanitasi state untuk mencegah cheat skor/status/giliran
    if (sender.role === 'siswa') {
      const forbiddenFields = ['activeGroupIndex', 'currentTurn', 'gameStatus', 'winner', 'roomConfig', 'pendingReviews', 'logs'];
      forbiddenFields.forEach(field => {
        delete data.state[field];
      });

      if (data.state.groups) {
        const otherTakenColors = room.groups
          .filter((mg: any) => mg.name.trim().toLowerCase() !== sender.groupName.trim().toLowerCase())
          .map((mg: any) => mg.color)
          .filter(Boolean);

        data.state.groups = data.state.groups.map((g: any) => {
          const originalGroup = room.groups.find((mg: any) => mg.id === g.id);
          if (!originalGroup) return null;

          // Siswa hanya boleh mengupdate posisi/avatar/warna kelompok mereka sendiri. Skor & status dikunci.
          if (originalGroup.name.trim().toLowerCase() === sender.groupName.trim().toLowerCase()) {
            let finalColor = g.color;
            if (g.color && otherTakenColors.includes(g.color)) {
              finalColor = originalGroup.color;
            }
            return {
              ...g,
              color: finalColor,
              id: originalGroup.id,
              name: originalGroup.name,
              score: originalGroup.score,
              status: originalGroup.status
            };
          }
          return originalGroup;
        }).filter(Boolean);
      }
    }

    // 3. Merge state into memory, but PROTECT server-side managed fields
    // 'groups' is server-authoritative — only modified via room:join/leave events.
    // Avatar/color sync for groups is handled separately below via DB.
    const protectedFields = ['intervalId', 'pendingReviews', 'logs', 'groups'];
    Object.keys(data.state).forEach(key => {
      if (!protectedFields.includes(key)) {
        (room as any)[key] = data.state[key];
      }
    });

    // 3. Persist to DB if groups are updated (profile/score sync) (Solusi B: Non-blocking DB updates)
    if (data.state.groups) {
      // Trigger database updates in the background (asynchronously) without blocking the WebSocket emit loop
      Promise.all(data.state.groups.map((g: any) => 
        prisma.group.update({
          where: { id: g.id },
          data: { 
            avatar: g.avatar, 
            color: g.color,
            score: g.score,
            position: g.position,
            status: g.status === 'WAITING' ? 'ACTIVE' : g.status
          }
        }).catch(err => {
          console.error(`[DB_SYNC] Gagal update group ${g.id}:`, err.message);
        })
      )).catch(err => {
        console.error(`[DB_SYNC] Promise.all failed:`, err);
      });

      // Synchronously update in-memory room groups (immediate update for room state)
      data.state.groups.forEach((g: any) => {
        const memGroup = room.groups.find((mg: any) => mg.id === g.id);
        if (memGroup) {
          if (g.avatar !== undefined) memGroup.avatar = g.avatar;
          if (g.color !== undefined) memGroup.color = g.color;
          if (g.score !== undefined) memGroup.score = g.score;
          if (g.position !== undefined) memGroup.position = g.position;
          if (g.status !== undefined) memGroup.status = g.status;
        }
      });
      room.groups.sort((a: any, b: any) => a.id.localeCompare(b.id));
    }

    // Persist room-level game state (turn, current index)
    if (data.state.activeGroupIndex !== undefined || data.state.currentTurn !== undefined) {
      // Clear submission locks for the new turn/group
      if ((room as any).submissionLocks) {
        (room as any).submissionLocks.clear();
      }

      prisma.room.update({
        where: { code: data.roomCode },
        data: {
          activeGroupIndex: data.state.activeGroupIndex,
          currentTurn: data.state.currentTurn
        } as any
      }).catch(err => console.error("[DB_SYNC] Gagal update room state:", err.message));
    }

    // 4. Broadcast the updated full room state (including groups) to all in room
    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", { ...roomData, roomCode: data.roomCode });
  });


  socket.on("game:start", async (roomCode: string) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.role !== 'guru' || sender.roomCode !== roomCode) {
      socket.emit("error", { message: "Akses ditolak: Anda tidak memiliki wewenang Guru." });
      return;
    }

    const room = activeRooms.get(roomCode);
    if (!room) return;

    // Persist session start to DB
    try {
      const dbRoom = await prisma.room.update({
        where: { code: roomCode },
        data: { status: 'ACTIVE' }
      });
      
      // Upsert GameSession
      await prisma.gameSession.upsert({
        where: { roomId: dbRoom.id },
        update: { startedAt: new Date(), endedAt: null },
        create: { roomId: dbRoom.id }
      });
    } catch (err) {
      console.error("Gagal mencatat sesi di DB:", err);
    }

    room.gameStatus = 'LOBBY';
    room.countdown = 3; 
    
    if (room.intervalId) clearInterval(room.intervalId);
    const timerId = setInterval(() => {
      const liveRoom = activeRooms.get(roomCode);
      if (!liveRoom) {
        clearInterval(timerId);
        return;
      }
      
      let updated = false;

      if (liveRoom.countdown !== null && liveRoom.countdown > 0) {
        liveRoom.countdown--;
        updated = true;
      } else if (liveRoom.countdown === 0) {
        liveRoom.countdown = null;
        liveRoom.gameStatus = 'PLAYING';
        liveRoom.isGlobalTimerRunning = true;
        liveRoom.globalTimer = liveRoom.roomConfig?.gameDurationSec || 600;
        liveRoom.phase = 'WAITING_FOR_ROLL';
        liveRoom.transitionTimer = undefined;
        liveRoom.hasRolled = false;
        liveRoom.isRolling = false;
        liveRoom.isMoving = false;
        updated = true;
      }

      if (liveRoom.isGlobalTimerRunning && liveRoom.globalTimer > 0) {
        liveRoom.globalTimer--;
        updated = true;
      }

      // Decrement main timer or resolve timeout
      if (liveRoom.isTimerRunning && liveRoom.timer > 0) {
        liveRoom.timer--;
        updated = true;
      } else if (liveRoom.isTimerRunning && liveRoom.timer === 0) {
        liveRoom.isTimerRunning = false;
        resolveServerTimeout(roomCode, io);
        updated = true;
      }

      // Check precise transition time for visual FSM animations
      if (liveRoom.transitionEndTime !== undefined) {
        if (Date.now() >= liveRoom.transitionEndTime) {
          liveRoom.transitionEndTime = undefined;
          liveRoom.transitionTimer = undefined;
          handleServerTransition(roomCode, io);
          updated = true;
        } else {
          // Sync transitionTimer (in seconds) for potential client monitoring/logs
          const remainingSec = Math.ceil((liveRoom.transitionEndTime - Date.now()) / 1000);
          if (liveRoom.transitionTimer !== remainingSec) {
            liveRoom.transitionTimer = remainingSec;
            updated = true;
          }
        }
      } else if (liveRoom.transitionTimer !== undefined) {
        // Fallback for any legacy code setting transitionTimer directly
        if (liveRoom.transitionTimer > 0) {
          liveRoom.transitionTimer--;
          if (liveRoom.transitionTimer === 0) {
            liveRoom.transitionTimer = undefined;
            handleServerTransition(roomCode, io);
          }
        } else {
          liveRoom.transitionTimer = undefined;
        }
        updated = true;
      }

      if (updated) {
        io.to(roomCode).emit("game:timer_sync", {
          timer: liveRoom.timer,
          globalTimer: liveRoom.globalTimer,
          countdown: liveRoom.countdown
        });
        
        if (liveRoom.gameStatus === 'PLAYING' && liveRoom.countdown === null) {
           const { intervalId, ...roomData } = liveRoom;
           io.to(roomCode).emit("game:state", roomData);
        }
      }

      if (liveRoom.globalTimer <= 0 && liveRoom.gameStatus === 'PLAYING') {
        finishGame(roomCode);
      }
    }, 1000);
    room.intervalId = timerId;

    const { intervalId: ignored, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  });

  async function finishGame(roomCode: string) {
    const room = activeRooms.get(roomCode);
    if (!room) return;

    room.gameStatus = 'FINISHED';
    room.isGlobalTimerRunning = false;
    room.isTimerRunning = false;
    room.currentCard = null;       // force close any active card overlay
    room.pendingReviews = [];      // discard any pending reviews so teacher panel closes
    if (room.intervalId) clearInterval(room.intervalId);

    // Filter out surrendered players for winner calculation
    const eligibleGroups = room.groups.filter(g => g.status !== 'SURRENDERED');
    const winner = eligibleGroups.length > 0 
      ? [...eligibleGroups].sort((a, b) => b.score - a.score)[0]
      : null;

    room.winner = winner;

    // Persist results to DB
    try {
      const dbRoom = await prisma.room.update({
        where: { code: roomCode },
        data: { status: 'ENDED' },
        include: { session: true }
      });

      // Update groups scores and positions in DB
      for (const g of room.groups) {
        await prisma.group.update({
          where: { id: g.id },
          data: { 
            score: g.score, 
            position: g.position
          }
        });
      }

      if (dbRoom.session) {
        await prisma.gameSession.update({
          where: { id: dbRoom.session.id },
          data: { 
            endedAt: new Date(),
            winnerGroupId: winner?.id || null
          }
        });
      }
    } catch (err) {
      console.error("Gagal menutup sesi di DB:", err);
    }

    const { intervalId, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);

    // Hapus room dari memori setelah 5 detik agar RAM di VPS tetap bersih
    setTimeout(() => {
      activeRooms.delete(roomCode);
      console.log(`[CLEANUP] Room ${roomCode} dihapus setelah selesai (game finished).`);
    }, 5000);
  }



  socket.on("student:submit_objektif", async (data: { roomCode: string, groupId: string, questionId: string, answer: string, isCorrect: boolean, score: number, turnNumber?: number }) => {
    const room = activeRooms.get(data.roomCode);
    if (!room || room.gameStatus === 'FINISHED') return;

    // Verifikasi identitas pengirim (harus guru atau kelompok siswa yang bersangkutan)
    const sender = socketToUser.get(socket.id);
    const targetGroup = room.groups.find(g => g.id === data.groupId);
    if (!sender || !targetGroup || (sender.role !== 'guru' && sender.groupName.trim().toLowerCase() !== targetGroup.name.trim().toLowerCase())) {
      socket.emit("error", { message: "Akses ditolak: Verifikasi identitas kelompok gagal." });
      return;
    }

    // Guard: Prevent double grading or submitting if already submitted/closed
    if (room.phase !== 'ACTIVE_QUESTION' || !room.currentCard) {
      return;
    }

    const group = room.groups.find(g => g.id === data.groupId);
    if (group) {
      group.score += data.score;
      room.logs = [`${group.name} menjawab ${data.isCorrect ? "benar" : "salah"}.`, ...room.logs];
    }

    const card = room.currentCard;
    const currentTurnAtSubmit = room.currentTurn;

    // Transition to turn resolved with a 3-second display of result toast
    room.currentCard = null;
    room.isTimerRunning = false;
    room.phase = 'TURN_RESOLVED';
    room.transitionEndTime = Date.now() + 3000;
    room.transitionTimer = 3;
    room.lastResult = {
      type: data.answer === 'TIMEOUT' ? 'FAILURE' : (data.isCorrect ? 'SUCCESS' : 'FAILURE'),
      title: data.answer === 'TIMEOUT' ? 'WAKTU HABIS!' : (data.isCorrect ? 'BENAR!' : 'SALAH!'),
      message: data.answer === 'TIMEOUT' 
        ? `Waktu habis! Jawaban tim ${group?.name || 'Siswa'} dianggap kosong.`
        : (data.isCorrect 
            ? `Selamat! Jawaban kamu tepat.` 
            : `Yah, kurang tepat. Jawabannya adalah: ${card.answerKey}`),
      points: data.score,
      groupName: group?.name || 'Siswa',
      turnNumber: currentTurnAtSubmit
    };

    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", roomData);

    // Background DB Persistence (non-blocking)
    try {
      let dbRoom = await prisma.room.findUnique({
        where: { code: data.roomCode },
        include: { session: true }
      });

      if (dbRoom) {
        // Auto-create session if missing
        if (!dbRoom.session) {
          const newSession = await prisma.gameSession.create({
            data: { roomId: dbRoom.id }
          });
          (dbRoom as any).session = newSession;
        }

        if (dbRoom.session) {
          await prisma.answer.create({
            data: {
              sessionId: dbRoom.session.id,
              groupId: data.groupId,
              questionId: data.questionId,
              answerText: data.answer,
              isCorrect: data.isCorrect,
              scoreGiven: data.score
            }
          });

          await prisma.turnLog.create({
            data: {
              sessionId: dbRoom.session.id,
              groupId: data.groupId,
              questionId: data.questionId,
              turnNumber: data.turnNumber || room.currentTurn || 1
            }
          });

          await prisma.group.update({
            where: { id: data.groupId },
            data: { score: group?.score || 0 }
          });
        }
      }
    } catch (err) {
      console.error("Gagal simpan jawaban objektif ke DB (non-blocking):", err);
    }
  });


  socket.on("student:submit_answer", async (data: { roomCode: string, groupId: string, questionId: string, answerText: string, points?: number, turnNumber?: number }) => {
    const room = activeRooms.get(data.roomCode);
    if (!room || room.gameStatus === 'FINISHED') return;

    // Verifikasi identitas pengirim (harus guru atau kelompok siswa yang bersangkutan)
    const sender = socketToUser.get(socket.id);
    const targetGroup = room.groups.find(g => g.id === data.groupId);
    if (!sender || !targetGroup || (sender.role !== 'guru' && sender.groupName.trim().toLowerCase() !== targetGroup.name.trim().toLowerCase())) {
      socket.emit("error", { message: "Akses ditolak: Verifikasi identitas kelompok gagal." });
      return;
    }

    // 1. SYNC GUARD: Prevent double submission for the same group in this turn
    // We use a temporary dynamic property on the room object for immediate locking
    if (!(room as any).submissionLocks) (room as any).submissionLocks = new Set<string>();
    const submissionKey = `${data.groupId}-${data.turnNumber || room.currentTurn}`;
    
    if ((room as any).submissionLocks.has(submissionKey)) {
      return;
    }
    
    // Check pendingReviews as a fallback
    const alreadyInReviews = room.pendingReviews.some(r => r.groupId === data.groupId);
    if (alreadyInReviews) {
       return;
    }

    // Set the lock IMMEDIATELY (synchronously) before any await calls
    (room as any).submissionLocks.add(submissionKey);


    try {
      let dbRoom = await prisma.room.findUnique({ 
        where: { code: data.roomCode },
        include: { session: true }
      });

      if (dbRoom) {
        // Auto-create session if missing
        if (!dbRoom.session) {
          const newSession = await prisma.gameSession.create({
            data: { roomId: dbRoom.id }
          });
          (dbRoom as any).session = newSession;
        }

        if (dbRoom.session) {
          const dbAnswer = await prisma.answer.create({
            data: {
              sessionId: dbRoom.session.id,
              groupId: data.groupId,
              questionId: data.questionId,
              answerText: data.answerText
            },
            include: { group: true, question: true }
          });

          await prisma.turnLog.create({
            data: {
              sessionId: dbRoom.session.id,
              groupId: data.groupId,
              questionId: data.questionId,
              turnNumber: data.turnNumber || room.currentTurn || 1
            }
          });

          const review = {
            id: `rev-${dbAnswer.id}`,
            dbAnswerId: dbAnswer.id,
            groupId: dbAnswer.groupId,
            groupName: dbAnswer.group.name,
            question: dbAnswer.question.text,
            answer: dbAnswer.answerText || "",
            points: data.points || dbAnswer.question.points || 10,
            answerKey: dbAnswer.question.answerKey || null
          };

          room.pendingReviews = [review, ...room.pendingReviews];
          room.logs = [`Jawaban tantangan masuk dari ${review.groupName}`, ...room.logs];


          io.to(data.roomCode).emit("game:state", {
            roomCode: data.roomCode,
            pendingReviews: room.pendingReviews,
            logs: room.logs
          });
        }
      }
    } catch (err) {
      console.error("[SUBMIT_ERROR] Gagal simpan jawaban siswa:", err);
      // Fallback: create an in-memory review so the teacher can still grade
      const group = room.groups.find(g => g.id === data.groupId);
      const fallbackReview = {
        id: `rev-fallback-${Date.now()}`,
        dbAnswerId: `fallback-${Date.now()}`,
        groupId: data.groupId,
        groupName: group?.name || "Siswa",
        question: "(Gagal memuat pertanyaan)",
        answer: data.answerText,
        points: data.points || 10,
        answerKey: null
      };
      room.pendingReviews = [fallbackReview, ...room.pendingReviews];
      room.logs = ["Sistem: Jawaban diterima (mode offline), menunggu penilaian guru.", ...room.logs];
      io.to(data.roomCode).emit("game:state", {
        roomCode: data.roomCode,
        pendingReviews: room.pendingReviews,
        logs: room.logs
      });
    }
  });

  socket.on("teacher:grade_answer", async (data: { roomCode: string, dbAnswerId: string, groupId: string, score: number, isCorrect: boolean }) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.role !== 'guru' || sender.roomCode !== data.roomCode) {
      socket.emit("error", { message: "Akses ditolak: Anda tidak memiliki wewenang Guru." });
      return;
    }

    const room = activeRooms.get(data.roomCode);
    if (!room || room.gameStatus === 'FINISHED') return;

    if (room.phase !== 'ACTIVE_QUESTION') return;

    const group = room.groups.find(g => g.id === data.groupId);
    if (group) {
      group.score += data.score;
    }

    const review = room.pendingReviews.find(r => r.dbAnswerId === data.dbAnswerId || r.id === data.dbAnswerId);
    room.pendingReviews = room.pendingReviews.filter(r => r.dbAnswerId !== data.dbAnswerId && r.id !== data.dbAnswerId);
    room.logs = [`Guru memberikan ${data.score} poin untuk ${group?.name || 'tim'}`, ...room.logs];

    const currentTurnAtGrade = room.currentTurn;

    room.currentCard = null;
    room.isTimerRunning = false;
    room.phase = 'TURN_RESOLVED';
    room.transitionEndTime = Date.now() + 3000;
    room.transitionTimer = 3;
    room.lastResult = {
      type: data.score > 0 ? 'SUCCESS' : 'FAILURE',
      title: data.score > 0 ? (data.score >= (review?.points || 10) ? 'TUNTAS!' : 'SEBAGIAN!') : 'BELUM TEPAT!',
      message: data.score > 0 
        ? `Guru memberikan penilaian: ${data.score} poin untuk tim ${group?.name || 'Siswa'}.`
        : `Yah, jawaban tim ${group?.name || 'Siswa'} dinilai kurang tepat oleh Guru.`,
      points: data.score,
      groupName: group?.name || 'Siswa',
      turnNumber: currentTurnAtGrade
    };

    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", roomData);

    // Background DB persistence — skip fallback in-memory answers that have no DB record
    if (!data.dbAnswerId.startsWith('fallback-')) {
      try {
        await prisma.answer.update({
          where: { id: data.dbAnswerId },
          data: {
            scoreGiven: data.score,
            isCorrect: data.isCorrect
          }
        });
        if (group) {
          await prisma.group.update({
            where: { id: group.id },
            data: { score: group.score }
          });
        }
      } catch (err) {
        console.error("Gagal simpan penilaian guru ke DB (Log Only):", err);
      }
    }
  });

  socket.on("game:roll_dice", async (roomCode: string) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.roomCode !== roomCode) return;
    
    const room = activeRooms.get(roomCode);
    if (!room || room.gameStatus !== 'PLAYING') return;
    
    if (room.hasRolled) {
      socket.emit("error", { message: "Dadu sudah dikocok pada giliran ini." });
      return;
    }

    const activeGroup = room.groups[room.activeGroupIndex];
    if (!activeGroup) return;

    const isMyTurn = sender.role !== 'guru' && activeGroup.name.trim().toLowerCase() === sender.groupName.trim().toLowerCase();
    const isGuruTakeover = sender.role === 'guru' && (activeGroup.isOffline || room.groups.every(g => g.isOffline || g.name === ''));
    if (!isMyTurn && !isGuruTakeover) {
      socket.emit("error", { message: "Akses ditolak: Bukan giliran kelompok Anda." });
      return;
    }

    const val = Math.floor(Math.random() * 6) + 1;
    room.diceValue = val;
    room.isRolling = true;
    room.hasRolled = true;
    room.isMoving = false;
    room.phase = 'ROLLING';
    room.transitionEndTime = Date.now() + 2000;
    room.transitionTimer = 2; // 2 seconds rolling animation
    room.logs = [`${activeGroup.name} mengocok dadu... hasil: ${val}`, ...room.logs];

    const { intervalId, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  });

  socket.on("game:select_branch", async (data: { roomCode: string, nextTileId: number }) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.roomCode !== data.roomCode) return;
    
    const room = activeRooms.get(data.roomCode);
    if (!room || room.gameStatus !== 'PLAYING') return;

    if (room.phase !== 'CHOOSING_PATH') return;

    const activeGroup = room.groups[room.activeGroupIndex];
    if (!activeGroup) return;

    const isMyTurn = sender.role !== 'guru' && activeGroup.name.trim().toLowerCase() === sender.groupName.trim().toLowerCase();
    const isGuruTakeover = sender.role === 'guru' && (activeGroup.isOffline || room.groups.every(g => g.isOffline || g.name === ''));
    if (!isMyTurn && !isGuruTakeover) return;

    const remaining = room.stepsRemaining || 0;
    const newRemaining = Math.max(0, remaining - 1);

    const { path, stepsRemaining } = calculateSubPath(data.nextTileId, newRemaining);
    const nextVisualPath = [data.nextTileId, ...path];
    const destinationTileId = nextVisualPath[nextVisualPath.length - 1];

    activeGroup.position = destinationTileId;
    room.isChoosingPath = false;
    room.availablePaths = [];
    room.stepsRemaining = stepsRemaining;
    room.visualPath = nextVisualPath;
    room.animatingPionId = activeGroup.id;
    room.isMoving = true;

    room.phase = 'MOVING';
    const moveDurationMs = nextVisualPath.length * 420 + 300;
    room.transitionEndTime = Date.now() + moveDurationMs;
    room.transitionTimer = Math.ceil(moveDurationMs / 1000);

    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", roomData);
  });

  socket.on("game:spin_star", async (roomCode: string) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.roomCode !== roomCode) return;
    
    const room = activeRooms.get(roomCode);
    if (!room || room.gameStatus !== 'PLAYING') return;

    if (room.phase !== 'STAR_SPINNING' || !room.isSpinningStar || room.isSpinAnimating || room.starSpinResult !== null) return;

    const activeGroup = room.groups[room.activeGroupIndex];
    if (!activeGroup) return;

    const isMyTurn = sender.role !== 'guru' && activeGroup.name.trim().toLowerCase() === sender.groupName.trim().toLowerCase();
    const isGuruTakeover = sender.role === 'guru' && (activeGroup.isOffline || room.groups.every(g => g.isOffline || g.name === ''));
    if (!isMyTurn && !isGuruTakeover) return;

    const options = ["+5", "-5", "DASAR", "TANTANGAN", "PEMAHAMAN", "SKIP"];
    const result = options[Math.floor(Math.random() * options.length)];

    room.isSpinAnimating = true;
    room.starSpinResult = result;
    room.transitionEndTime = Date.now() + 3000;
    room.transitionTimer = 3; // 3 seconds spinning animation
    room.logs = [`Roda putar STAR berputar untuk tim ${activeGroup.name}...`, ...room.logs];

    const { intervalId, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  });

  socket.on("game:skip_turn", async (roomCode: string) => {
    const sender = socketToUser.get(socket.id);
    if (!sender || sender.roomCode !== roomCode || sender.role !== 'guru') return;
    
    const room = activeRooms.get(roomCode);
    if (!room || room.gameStatus !== 'PLAYING') return;

    room.logs = [`Guru melompati giliran kelompok ${room.groups[room.activeGroupIndex]?.name ?? ''}`, ...room.logs];
    advanceTurn(roomCode, io);
  });
}

// ─── SERVER-SIDE FSM TRANSITION HELPERS ───────────────────────────────────────

function drawCard(roomCode: string, type: string, io: Server) {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  const activeGroup = room.groups[room.activeGroupIndex];
  if (!activeGroup) return;

  const typeUpper = type.toUpperCase();
  const questions = room.questions && room.questions.length > 0 ? room.questions : [];

  // Get or initialize the decks map for this room
  let decks = roomDecks.get(roomCode);
  if (!decks) {
    decks = { dasar: [], tantangan: [], pemahaman: [] };
    roomDecks.set(roomCode, decks);
  }

  let card: any = null;

  if (typeUpper === 'DASAR') {
    if (decks.dasar.length === 0) {
      decks.dasar = shuffleArray(questions.filter(q => q.type?.toUpperCase() === 'DASAR'));
    }
    if (decks.dasar.length === 0) {
      room.logs = [`Sistem: Tidak ada soal untuk tipe ${type}!`, ...room.logs];
      io.to(roomCode).emit("game:state", { roomCode, logs: room.logs });
      setTimeout(() => advanceTurn(roomCode, io), 2000);
      return;
    }
    card = decks.dasar.pop();
  } else if (typeUpper === 'TANTANGAN') {
    if (decks.tantangan.length === 0) {
      decks.tantangan = shuffleArray(questions.filter(q => q.type?.toUpperCase() === 'TANTANGAN'));
    }
    if (decks.tantangan.length === 0) {
      room.logs = [`Sistem: Tidak ada soal untuk tipe ${type}!`, ...room.logs];
      io.to(roomCode).emit("game:state", { roomCode, logs: room.logs });
      setTimeout(() => advanceTurn(roomCode, io), 2000);
      return;
    }
    card = decks.tantangan.pop();
  } else if (typeUpper === 'PEMAHAMAN') {
    if (decks.pemahaman.length === 0) {
      decks.pemahaman = shuffleArray(questions.filter(q => q.type?.toUpperCase() === 'PEMAHAMAN'));
    }
    if (decks.pemahaman.length === 0) {
      room.logs = [`Sistem: Tidak ada soal untuk tipe ${type}!`, ...room.logs];
      io.to(roomCode).emit("game:state", { roomCode, logs: room.logs });
      setTimeout(() => advanceTurn(roomCode, io), 2000);
      return;
    }
    card = decks.pemahaman.pop();
  } else {
    room.logs = [`Sistem: Tipe soal ${type} tidak dikenal!`, ...room.logs];
    io.to(roomCode).emit("game:state", { roomCode, logs: room.logs });
    setTimeout(() => advanceTurn(roomCode, io), 2000);
    return;
  }

  room.currentCard = card;
  room.timer = (card.type === 'PEMAHAMAN' ? room.roomConfig.turnDurationPemahaman :
                card.type === 'TANTANGAN' ? room.roomConfig.turnDurationTantangan :
                room.roomConfig.turnDurationDasar) || (card.type === 'PEMAHAMAN' ? 90 : card.type === 'TANTANGAN' ? 60 : 30);
  room.isTimerRunning = true;
  room.phase = 'ACTIVE_QUESTION';
  room.logs = [`Kartu ${card.type} ditarik: ${card.text}`, ...room.logs];

  const { intervalId, ...roomData } = room;
  io.to(roomCode).emit("game:state", roomData);
}

function resolvePawnLanding(roomCode: string, io: Server) {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  const activeGroup = room.groups[room.activeGroupIndex];
  if (!activeGroup) return;

  const tile = getTileById(activeGroup.position);

  if (tile.type === 'SKIP') {
    room.logs = [`${activeGroup.name} mendarat di petak SKIP!`, ...room.logs];
    room.phase = 'TURN_RESOLVED';
    room.transitionEndTime = Date.now() + 3000;
    room.transitionTimer = 3; 
    room.lastResult = {
      type: "INFO",
      title: "GILIRAN DILEWATI",
      message: `Tim ${activeGroup.name} mendarat di petak SKIP. Giliran dilewati!`,
      points: 0,
      groupName: activeGroup.name,
      turnNumber: room.currentTurn
    };

    const { intervalId, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  } else if (tile.type === 'STAR') {
    room.logs = [`${activeGroup.name} mendarat di petak STAR! Roda putar aktif.`, ...room.logs];
    room.phase = 'STAR_SPINNING';
    room.isSpinningStar = true;
    room.starSpinResult = null;
    room.isSpinAnimating = false;

    const { intervalId, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  } else {
    drawCard(roomCode, tile.type, io);
  }
}

async function advanceTurn(roomCode: string, io: Server) {
  const room = activeRooms.get(roomCode);
  if (!room || room.gameStatus === 'FINISHED') return;

  if (room.groups.length === 0) return;

  let nextIndex = (room.activeGroupIndex + 1) % room.groups.length;
  let searchCount = 0;
  
  while (room.groups[nextIndex].status === 'SURRENDERED' && searchCount < room.groups.length) {
    nextIndex = (nextIndex + 1) % room.groups.length;
    searchCount++;
  }

  room.activeGroupIndex = nextIndex;
  room.currentTurn += 1;
  room.currentCard = null;
  room.lastResult = null;
  room.timer = 0;
  room.isTimerRunning = false;
  room.isMoving = false;
  room.isRolling = false;
  room.hasRolled = false;
  room.isChoosingPath = false;
  room.availablePaths = [];
  room.stepsRemaining = 0;
  room.isSpinningStar = false;
  room.starSpinResult = null;
  room.isSpinAnimating = false;
  room.visualPath = [];
  room.phase = 'WAITING_FOR_ROLL';
  room.transitionTimer = undefined;
  room.transitionEndTime = undefined;

  try {
    await prisma.room.update({
      where: { code: roomCode },
      data: {
        activeGroupIndex: nextIndex,
        currentTurn: room.currentTurn
      }
    });
  } catch (err) {
    console.error("Gagal update turn saat advance di DB:", err);
  }

  const { intervalId, ...roomData } = room;
  io.to(roomCode).emit("game:state", roomData);
}

async function resolveServerTimeout(roomCode: string, io: Server) {
  const room = activeRooms.get(roomCode);
  if (!room || !room.currentCard) return;

  const activeGroup = room.groups[room.activeGroupIndex];
  if (!activeGroup) return;

  const card = room.currentCard;
  const currentTurnAtTimeout = room.currentTurn;

  room.currentCard = null;
  room.isTimerRunning = false;
  room.phase = 'TURN_RESOLVED';
  room.transitionEndTime = Date.now() + 3000;
  room.transitionTimer = 3;
  room.lastResult = {
    type: 'FAILURE',
    title: 'WAKTU HABIS!',
    message: `Waktu menjawab telah habis untuk tim ${activeGroup.name}.`,
    points: 0,
    groupName: activeGroup.name,
    turnNumber: currentTurnAtTimeout
  };

  const { intervalId, ...roomData } = room;
  io.to(roomCode).emit("game:state", roomData);

  try {
    let dbRoom = await prisma.room.findUnique({
      where: { code: roomCode },
      include: { session: true }
    });

    if (dbRoom) {
      if (!dbRoom.session) {
        const newSession = await prisma.gameSession.create({
          data: { roomId: dbRoom.id }
        });
        (dbRoom as any).session = newSession;
      }

      if (dbRoom.session) {
        const fallbackText = card.type === 'DASAR' 
          ? 'TIMEOUT' 
          : (card.type === 'PEMAHAMAN' 
              ? 'Waktu habis, jawaban tulisan belum selesai.' 
              : 'Waktu habis, siswa belum selesai menjawab lisan.');

        await prisma.answer.create({
          data: {
            sessionId: dbRoom.session.id,
            groupId: activeGroup.id,
            questionId: card.id,
            answerText: fallbackText,
            isCorrect: false,
            scoreGiven: 0
          }
        });

        await prisma.turnLog.create({
          data: {
            sessionId: dbRoom.session.id,
            groupId: activeGroup.id,
            questionId: card.id,
            turnNumber: currentTurnAtTimeout
          }
        });
      }
    }
  } catch (err) {
    console.error("Gagal menyimpan timeout ke DB:", err);
  }
}

function handleServerTransition(roomCode: string, io: Server) {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  if (room.phase === 'ROLLING') {
    room.isRolling = false;
    const activeGroup = room.groups[room.activeGroupIndex];
    if (!activeGroup) return;

    const diceVal = room.diceValue || 1;
    const { path, stepsRemaining } = calculateSubPath(activeGroup.position, diceVal);

    if (path.length === 0) {
      const currentTile = getTileById(activeGroup.position);
      if (stepsRemaining > 0 && currentTile.next && currentTile.next.length > 1) {
        room.isChoosingPath = true;
        room.availablePaths = currentTile.next;
        room.stepsRemaining = stepsRemaining;
        room.isMoving = false;
        room.phase = 'CHOOSING_PATH';
        room.transitionTimer = undefined;
        room.transitionEndTime = undefined;
      } else {
        room.stepsRemaining = 0;
        room.isMoving = false;
        room.visualPath = [];
        resolvePawnLanding(roomCode, io);
      }
    } else {
      const destinationTileId = path[path.length - 1];
      activeGroup.position = destinationTileId;
      room.stepsRemaining = stepsRemaining;
      room.visualPath = path;
      room.animatingPionId = activeGroup.id;
      room.isMoving = true;
      room.phase = 'MOVING';
      const moveDurationMs = 500 + path.length * 420 + 300;
      room.transitionEndTime = Date.now() + moveDurationMs;
      room.transitionTimer = Math.ceil(moveDurationMs / 1000);
    }

    const { intervalId, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  } 
  else if (room.phase === 'MOVING') {
    room.isMoving = false;
    room.visualPath = [];
    room.animatingPionId = null;

    const activeGroup = room.groups[room.activeGroupIndex];
    if (activeGroup) {
      const currentTile = getTileById(activeGroup.position);
      const stepsRemaining = room.stepsRemaining || 0;
      if (stepsRemaining > 0 && currentTile.next && currentTile.next.length > 1) {
        room.isChoosingPath = true;
        room.availablePaths = currentTile.next;
        room.phase = 'CHOOSING_PATH';
        room.transitionTimer = undefined;
        room.transitionEndTime = undefined;

        const { intervalId, ...roomData } = room;
        io.to(roomCode).emit("game:state", roomData);
        return;
      }
    }

    resolvePawnLanding(roomCode, io);
  } 
  else if (room.phase === 'STAR_SPINNING') {
    room.isSpinAnimating = false;
    const result = room.starSpinResult;
    const activeGroup = room.groups[room.activeGroupIndex];
    
    if (!activeGroup || !result) return;

    const currentTurnAtResult = room.currentTurn;

    if (result === "+5" || result === "-5") {
      const points = result === "+5" ? 5 : -5;
      activeGroup.score = Math.max(0, activeGroup.score + points);
      
      room.isSpinningStar = false;
      room.phase = 'TURN_RESOLVED';
      room.transitionEndTime = Date.now() + 3000;
      room.transitionTimer = 3; 
      room.lastResult = {
        type: points > 0 ? "SUCCESS" : "FAILURE",
        title: points > 0 ? "BONUS POIN!" : "POIN DIKURANGI!",
        message: points > 0 
          ? `Selamat! Tim ${activeGroup.name} mendapatkan bonus +5 poin dari roda putar STAR.` 
          : `Aduh! Tim ${activeGroup.name} kehilangan -5 poin dari roda putar STAR.`,
        points: points,
        groupName: activeGroup.name,
        turnNumber: currentTurnAtResult
      };
      room.logs = [`Tim ${activeGroup.name} mendapat hasil roda putar: ${result} (Poin sekarang: ${activeGroup.score})`, ...room.logs];

      prisma.group.update({
        where: { id: activeGroup.id },
        data: { score: activeGroup.score }
      }).catch(err => console.error("Gagal update score bintang di DB:", err));

    } else if (result === "SKIP") {
      room.isSpinningStar = false;
      room.phase = 'TURN_RESOLVED';
      room.transitionEndTime = Date.now() + 3000;
      room.transitionTimer = 3;
      room.lastResult = {
        type: "INFO",
        title: "GILIRAN DILEWATI",
        message: `Tim ${activeGroup.name} mendapat SKIP. Tidak terjadi apa-apa dan giliran dilewati.`,
        points: 0,
        groupName: activeGroup.name,
        turnNumber: currentTurnAtResult
      };
      room.logs = [`Tim ${activeGroup.name} mendapat hasil roda putar: SKIP. Giliran dilewati.`, ...room.logs];

    } else {
      room.isSpinningStar = false;
      drawCard(roomCode, result, io);
      return;
    }

    const { intervalId, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  } 
  else if (room.phase === 'TURN_RESOLVED') {
    advanceTurn(roomCode, io);
  }
}
