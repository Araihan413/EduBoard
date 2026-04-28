import { Server, Socket } from "socket.io";
import { prisma } from "@repo/db";

interface ActiveRoom {
  roomConfig: { 
    gameDurationSec: number; 
    maxGroups: number;
    turnDurationDasar?: number;
    turnDurationTantangan?: number;
    turnDurationAksi?: number;
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
}

const activeRooms = new Map<string, ActiveRoom>();
const socketToUser = new Map<string, { roomCode: string, groupName: string, role: string }>();

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
          }).catch(err => console.warn(`[DEBUG] [SERVER] Could not update group ${group.id} status in DB: ${err.message}`));
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
      console.log(`Group ${data.groupName} left room ${data.roomCode}`);
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
    console.log(`Socket ${socket.id} disconnected (${groupName || role} from ${roomCode}). Remaining: ${otherSockets.length}`);
  });

  socket.on("room:cancel", async (roomCode: string) => {
    const room = activeRooms.get(roomCode);
    if (room) {
      try {
        await prisma.room.update({
          where: { code: roomCode },
          data: { status: 'CANCELLED' }
        });
        io.to(roomCode).emit("room:cancelled", { roomCode });
        activeRooms.delete(roomCode);
        console.log(`Room ${roomCode} cancelled by Guru`);
      } catch (err) {
        console.error("Gagal batalkan room:", err);
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
    console.log(`[DEBUG] [SERVER] Socket ${socket.id} joined room ${data.roomCode}. Identity:`, { groupName: data.groupName, role: data.role });
    
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
            })),
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
              points: a.question.points
            })) : [],
            logs: ["Sesi dipulihkan dari database."],
            countdown: null
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
            countdown: null
          });
        }
      } catch (err) {
        console.error("Gagal memulihkan room:", err);
      }
    }

    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    if (data.role !== 'guru' && data.groupName) {
      const normalizedName = data.groupName.trim().toLowerCase();
      console.log(`[DEBUG] [SERVER] Checking for existing group: "${normalizedName}" among:`, room.groups.map(g => g.name.toLowerCase()));
      const existingGroup = room.groups.find((g: any) => g.name.trim().toLowerCase() === normalizedName);
      
      if (existingGroup) {
        if (existingGroup.status === 'SURRENDERED') {
          socket.emit("error", { message: "Anda sudah menyerah dari permainan ini." });
          socket.leave(data.roomCode);
          socketToUser.delete(socket.id);
          return;
        }
        existingGroup.isOffline = false;
        if (data.avatar) existingGroup.avatar = data.avatar;
        if (data.color) existingGroup.color = data.color;
        
        room.logs = [`${existingGroup.name} kembali masuk.`, ...room.logs];
        
        // Update DB in background
        prisma.group.update({
          where: { id: existingGroup.id },
          data: { 
            avatar: existingGroup.avatar, 
            color: existingGroup.color 
          }
        }).catch(err => {
          // If update fails because record is missing, it's okay, we'll rely on memory
        });

      } else {
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
          const newGroupEntry = {
            id: tempId,
            name: data.groupName,
            score: 0,
            position: 0,
            status: 'WAITING',
            avatar: data.avatar,
            color: data.color,
            isOffline: false
          };
          room.groups.push(newGroupEntry);

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
                color: data.color
              }
            });

            // 3. Update the memory entry with the real DB ID
            newGroupEntry.id = dbGroup.id;
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

  // Handle intentional leave — removes group from memory and DB
  socket.on("room:leave", async (data: { roomCode: string; groupName: string }) => {
    console.log(`[DEBUG] [SERVER] Received room:leave for room ${data.roomCode}, group ${data.groupName}`);
    if (!data.roomCode || !data.groupName) {
      console.warn('[DEBUG] [SERVER] room:leave ignored: missing roomCode or groupName');
      return;
    }
    const room = activeRooms.get(data.roomCode);
    if (!room) {
      console.warn(`[DEBUG] [SERVER] room:leave ignored: room ${data.roomCode} not found in memory`);
      return;
    }

    const normalizedName = data.groupName.trim().toLowerCase();
    const groupIndex = room.groups.findIndex((g: any) => g.name.trim().toLowerCase() === normalizedName);

    if (groupIndex !== -1) {
      const [removed] = room.groups.splice(groupIndex, 1);
      console.log(`[DEBUG] [SERVER] Group "${removed.name}" removed from memory for room ${data.roomCode}`);
      
      // Delete from DB so it doesn't reappear on guru refresh
      if (removed.id) {
        prisma.group.delete({ where: { id: removed.id } })
          .then(() => console.log(`[DEBUG] [SERVER] Group ${removed.name} deleted from DB`))
          .catch(err => console.error(`[DEBUG] [SERVER] Failed to delete group ${removed.id}:`, err.message));
      }

      room.logs = [`${removed.name} keluar dari ruang.`, ...room.logs];

      // Broadcast updated state to remaining members
      const { intervalId, ...roomData } = room;
      io.to(data.roomCode).emit("game:state", { ...roomData, roomCode: data.roomCode });
    }
  });

  socket.on("game:sync_state", async (data: { roomCode: string, state: any }) => {
    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    // 1. If the client is signaling the game is FINISHED, use the dedicated finish logic
    if (data.state.gameStatus === 'FINISHED' && room.gameStatus !== 'FINISHED') {
      return await finishGame(data.roomCode);
    }

    // 2. Merge state into memory, but PROTECT server-side managed fields
    // 'groups' is server-authoritative — only modified via room:join/leave events.
    // Avatar/color sync for groups is handled separately below via DB.
    const protectedFields = ['intervalId', 'pendingReviews', 'logs', 'groups'];
    Object.keys(data.state).forEach(key => {
      if (!protectedFields.includes(key)) {
        (room as any)[key] = data.state[key];
      }
    });

    // 3. Persist to DB if groups are updated (profile/score sync)
    if (data.state.groups) {
      await Promise.all(data.state.groups.map(async (g: any) => {
        // Update DB
        await prisma.group.update({
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
        });

        // Also sync avatar/color into in-memory groups (since 'groups' is protected from bulk overwrite)
        const memGroup = room.groups.find((mg: any) => mg.id === g.id);
        if (memGroup) {
          if (g.avatar !== undefined) memGroup.avatar = g.avatar;
          if (g.color !== undefined) memGroup.color = g.color;
          if (g.score !== undefined) memGroup.score = g.score;
          if (g.position !== undefined) memGroup.position = g.position;
          if (g.status !== undefined) memGroup.status = g.status;
        }
      }));
    }

    // Persist room-level game state (turn, current index)
    if (data.state.activeGroupIndex !== undefined || data.state.currentTurn !== undefined) {
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
    room.intervalId = setInterval(() => {
      const liveRoom = activeRooms.get(roomCode);
      if (!liveRoom) return;
      
      let updated = false;

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

      if (liveRoom.isGlobalTimerRunning && liveRoom.globalTimer > 0) {
        liveRoom.globalTimer--;
        updated = true;
      }

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
        
        if (liveRoom.gameStatus === 'PLAYING' && liveRoom.countdown === null) {
           const { intervalId, ...roomData } = liveRoom;
           io.to(roomCode).emit("game:state", roomData);
        }
      }

      if (liveRoom.globalTimer <= 0 && liveRoom.gameStatus === 'PLAYING') {
        finishGame(roomCode);
      }
    }, 1000);

    const { intervalId: ignored, ...roomData } = room;
    io.to(roomCode).emit("game:state", roomData);
  });

  async function finishGame(roomCode: string) {
    const room = activeRooms.get(roomCode);
    if (!room) return;

    room.gameStatus = 'FINISHED';
    room.isGlobalTimerRunning = false;
    room.isTimerRunning = false;
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
  }



  socket.on("student:submit_objektif", async (data: { roomCode: string, groupId: string, questionId: string, answer: string, isCorrect: boolean, score: number, turnNumber?: number }) => {
    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    const group = room.groups.find(g => g.id === data.groupId);
    if (group) {
      group.score += data.score;
      room.logs = [`${group.name} menjawab ${data.isCorrect ? "benar" : "salah"}`, ...room.logs];
    }

    // Broadcast immediately to ensure game continues
    io.to(data.roomCode).emit("game:state", {
      roomCode: data.roomCode,
      groups: room.groups,
      logs: room.logs
    });

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
    if (!room) return;

    console.log(`[SUBMIT_ANSWER] Room: ${data.roomCode}, Group: ${data.groupId}, Q: ${data.questionId}`);

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
            points: data.points || dbAnswer.question.points || 10
          };

          room.pendingReviews = [review, ...room.pendingReviews];
          room.logs = [`Jawaban tantangan masuk dari ${review.groupName}`, ...room.logs];

          console.log(`[SUBMIT_DB] Success. Review created for ${review.groupName}`);

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
        points: data.points || 10
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
    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    // Always update in-memory state first (so game never hangs)
    const group = room.groups.find(g => g.id === data.groupId);
    if (group) {
      group.score += data.score;
    }
    room.pendingReviews = room.pendingReviews.filter(r => r.dbAnswerId !== data.dbAnswerId);
    room.logs = [`Guru memberikan ${data.score} poin untuk ${group?.name || 'tim'}`, ...room.logs];

    // Broadcast immediately — game continues regardless of DB
    io.to(data.roomCode).emit("game:state", {
      roomCode: data.roomCode,
      groups: room.groups,
      pendingReviews: room.pendingReviews,
      logs: room.logs,
      lastResult: {
        type: data.score > 0 ? 'SUCCESS' : 'FAILURE',
        title: data.score > 0 ? 'DINILAI!' : 'TIDAK TEPAT!',
        message: data.score > 0 
          ? `Guru memberikan ${data.score} poin untuk jawabanmu!` 
          : `Guru menyatakan jawaban kurang tepat (0 poin).`,
        points: data.score,
        groupName: group?.name || 'Siswa'
      }
    });

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
}
