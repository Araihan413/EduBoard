import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, RoomStatus } from "@repo/db";
import { CreateRoomSchema } from "@repo/types";

export default async function roomRoutes(fastify: FastifyInstance) {
  // Authentication Guard
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  // GET All Room History (Sessions) for the Teacher
  fastify.get("/history", async (request, reply) => {
    const user = request.user as { id: string };
    
    const rooms = await prisma.room.findMany({
      where: { 
        guruId: user.id,
        status: 'ENDED' // Only show finished rooms in history
      },
      include: {
        groups: {
          orderBy: { score: 'desc' }
        },
        session: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return rooms;
  });

  // POST Create New Room
  fastify.post("/", async (request, reply) => {
    try {
      const user = request.user as { id: string };
      const config = CreateRoomSchema.parse(request.body);

      // Generate unique 6-char code
      let code = "";
      let isUnique = false;
      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const existing = await prisma.room.findUnique({ where: { code } });
        if (!existing) isUnique = true;
      }

      const room = await prisma.room.create({
        data: {
          code,
          guruId: user.id,
          status: 'LOBBY',
          durationMinutes: config.durationMinutes,
          turnDurationDasar: config.turnDurationDasar,
          turnDurationTantangan: config.turnDurationTantangan,
          turnDurationAksi: config.turnDurationAksi,
          maxGroups: config.maxGroups,
        }
      });

      return room;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: err.errors[0].message });
      }
      return reply.code(500).send({ error: "Gagal membuat ruang" });
    }
  });

  // GET Active Room Details
  fastify.get("/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        groups: true,
        session: true
      }
    });

    if (!room) {
      return reply.code(404).send({ error: "Ruang tidak ditemukan" });
    }

    return room;
  });
}
