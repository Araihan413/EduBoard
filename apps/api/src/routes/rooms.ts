import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, RoomStatus } from "@repo/db";
import { CreateRoomSchema } from "@repo/types";

import { verifySupabaseAuth } from "../supabaseAuth";

export default async function roomRoutes(fastify: FastifyInstance) {
  // Protected Routes - Only for authenticated Teachers
  // MUST be registered BEFORE the dynamic /:code route
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("onRequest", verifySupabaseAuth);

    // GET All Room History (Sessions) for the Teacher
    protectedRoutes.get("/history", async (request, reply) => {
      const user = request.user as { id: string };
      
      const rooms = await prisma.room.findMany({
        where: { 
          guruId: user.id,
          status: 'ENDED'
        },
        include: {
          groups: { orderBy: { score: 'desc' } },
          session: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return rooms;
    });

    // POST Create New Room
    protectedRoutes.post("/", async (request, reply) => {
      try {
        const user = request.user as { id: string };
        const config = CreateRoomSchema.parse(request.body);

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
            questionSetId: (request.body as any).questionSetId || null
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
  });

  // GET Room by Code - PUBLIC (For Students joining, no auth required)
  // Registered AFTER protected routes so /history is matched first
  fastify.get("/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = await prisma.room.findUnique({
      where: { code },
      include: { groups: true, session: true }
    });

    if (!room) {
      return reply.code(404).send({ error: "Ruang tidak ditemukan" });
    }

    return room;
  });
}
