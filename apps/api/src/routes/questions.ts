import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, QuestionType } from "@repo/db";
import { QuestionSchema } from "@repo/types";
import { verifySupabaseAuth } from "../supabaseAuth";

export default async function questionRoutes(fastify: FastifyInstance) {
  // GET Questions for a specific Set (PUBLIC for Students)
  fastify.get("/", async (request, reply) => {
    const { setId, page = "1", limit = "50" } = request.query as { setId: string, page?: string, limit?: string };
    if (!setId) return reply.code(400).send({ error: "setId wajib disertakan" });

    const p = parseInt(page);
    const l = parseInt(limit);
    const skip = (p - 1) * l;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: { setId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l
      }),
      prisma.question.count({ where: { setId } })
    ]);

    return {
      data: questions,
      meta: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      }
    };
  });

  // POST New Question into a Set (PROTECTED)
  fastify.post("/", { onRequest: [verifySupabaseAuth] }, async (request, reply) => {
    try {
      const user = request.user as { id: string };
      const { setId, ...dataRaw } = request.body as any;
      const data = QuestionSchema.parse(dataRaw);

      if (!setId) return reply.code(400).send({ error: "setId wajib disertakan" });

      // Verify Set ownership
      const set = await prisma.questionSet.findFirst({
        where: { id: setId, guruId: user.id }
      });
      if (!set) return reply.code(403).send({ error: "Anda tidak memiliki akses ke paket ini" });

      const q = await prisma.question.create({
        data: {
          setId,
          type: data.type as QuestionType,
          text: data.text,
          options: data.options ?? [],
          answerKey: data.answerKey,
          points: data.points,
        }
      });
      return q;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: err.errors[0].message });
      }
      return reply.code(500).send({ error: "Gagal menyimpan soal" });
    }
  });

  // PUT Update Question (PROTECTED)
  fastify.put("/:id", { onRequest: [verifySupabaseAuth] }, async (request, reply) => {
    try {
      const user = request.user as { id: string };
      const { id } = request.params as { id: string };
      const data = QuestionSchema.partial().parse(request.body);

      // Verify ownership via Set
      const existing = await prisma.question.findFirst({ 
        where: { 
          id, 
          set: { guruId: user.id } 
        } 
      });
      
      if (!existing) {
        return reply.code(404).send({ error: "Soal tidak ditemukan atau Anda tidak memiliki akses" });
      }

      const q = await prisma.question.update({
        where: { id },
        data: {
          type: data.type as QuestionType | undefined,
          text: data.text,
          options: data.options ?? [],
          answerKey: data.answerKey,
          points: data.points,
        }
      });
      return q;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: err.errors[0].message });
      }
      return reply.code(500).send({ error: "Gagal memperbarui soal" });
    }
  });

  // DELETE Question (PROTECTED)
  fastify.delete("/:id", { onRequest: [verifySupabaseAuth] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.question.findFirst({ 
      where: { 
        id, 
        set: { guruId: user.id } 
      } 
    });

    if (!existing) {
      return reply.code(404).send({ error: "Soal tidak ditemukan atau Anda tidak memiliki akses" });
    }

    await prisma.question.delete({ where: { id } });
    return { success: true };
  });
}
