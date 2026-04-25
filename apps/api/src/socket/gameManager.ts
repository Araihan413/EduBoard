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
  groups: any[];
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
  intervalId?: NodeJS.Timeout;
}

const activeRooms = new Map<string, ActiveRoom>();

export function handleSocketEvents(io: Server, socket: Socket) {
  
  socket.on("room:leave", async (data: { roomCode: string, groupName: string }) => {
    const room = activeRooms.get(data.roomCode);
    if (room) {
      room.groups = room.groups.filter((g: any) => g.name !== data.groupName);
      if (room.gameStatus === 'LOBBY') {
        await prisma.group.deleteMany({
          where: {
            room: { code: data.roomCode },
            name: data.groupName
          }
        });
      }
      io.to(data.roomCode).emit("game:state", { groups: room.groups });
      socket.leave(data.roomCode);
      console.log(`Group ${data.groupName} left room ${data.roomCode}`);
    }
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
  
  socket.on("room:join", async (data: { roomCode: string, groupName: string, role?: string, roomConfig?: any, avatar?: string, color?: string }) => {
    socket.join(data.roomCode);
    
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


    const room = activeRooms.get(data.roomCode)!;

    if (data.role !== 'guru' && data.groupName) {
      const maxG = room.roomConfig?.maxGroups || 4;
      if (room.groups.length < maxG && !room.groups.find((g: any) => g.name === data.groupName)) {
        try {
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

            room.groups.push({
              id: dbGroup.id,
              name: data.groupName,
              score: 0,
              position: 0,
              status: 'WAITING',
              avatar: data.avatar,
              color: data.color
            });
            room.logs = [`${data.groupName} bergabung.`, ...room.logs];
          }
        } catch (err) {
          console.error("Gagal menyimpan group ke DB:", err);
        }
      }
    }

    const { intervalId, ...roomData } = room;
    io.to(data.roomCode).emit("game:state", roomData);
  });

  socket.on("game:sync_state", async (data: { roomCode: string, state: any }) => {
    const room = activeRooms.get(data.roomCode);
    if (!room) return;

    // 1. If the client is signaling the game is FINISHED, use the dedicated finish logic
    if (data.state.gameStatus === 'FINISHED' && room.gameStatus !== 'FINISHED') {
      return await finishGame(data.roomCode);
    }

    // 2. Merge state into memory, but PROTECT server-side managed fields
    const protectedFields = ['intervalId', 'pendingReviews', 'logs'];
    Object.keys(data.state).forEach(key => {
      if (!protectedFields.includes(key)) {
        (room as any)[key] = data.state[key];
      }
    });

    // 3. Persist to DB if groups are updated (profile/score sync)
    if (data.state.groups) {
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
          // Log specific group error but don't stop other groups
          console.error(`[DB_SYNC] Gagal update group ${g.id}:`, err.message);
        })
      ));
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

    // 4. Broadcast the updated state to others in the room
    const { intervalId, ...roomData } = room;
    socket.to(data.roomCode).emit("game:state", roomData);
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

    // Persist results to DB
    try {
      const dbRoom = await prisma.room.update({
        where: { code: roomCode },
        data: { status: 'ENDED' },
        include: { session: true }
      });

      // Update groups scores and positions in DB
      for (const g of room.groups) {
        g.status = 'WAITING'; // Update in-memory only
        await prisma.group.update({
          where: { id: g.id },
          data: { 
            score: g.score, 
            position: g.position
            // Note: do NOT set status here — Prisma enum cast fails with plain string
          }
        });
      }

      if (dbRoom.session) {
        // Find winner
        const winner = [...room.groups].sort((a, b) => b.score - a.score)[0];
        await prisma.gameSession.update({
          where: { id: dbRoom.session.id },
          data: { 
            endedAt: new Date(),
            winnerGroupId: winner?.id 
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
