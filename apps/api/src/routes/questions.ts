import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, QuestionType } from "@repo/db";
import { QuestionSchema } from "@repo/types";
import { verifySupabaseAuth } from "../supabaseAuth";

export default async function questionRoutes(fastify: FastifyInstance) {
  // Authentication Guard
  fastify.addHook("onRequest", verifySupabaseAuth);

  // GET All Questions for the authenticated Teacher (RLS enforced)
  fastify.get("/", async (request, reply) => {
    const user = request.user as { id: string };
    const questions = await prisma.question.findMany({
      where: { guruId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    return questions;
  });

  // POST New Question (guruId forced to authenticated user)
  fastify.post("/", async (request, reply) => {
    try {
      const user = request.user as { id: string };
      const data = QuestionSchema.parse(request.body);

      const q = await prisma.question.create({
        data: {
          guruId: user.id,
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

  // PUT Update Question (Ownership check enforced)
  fastify.put("/:id", async (request, reply) => {
    try {
      const user = request.user as { id: string };
      const { id } = request.params as { id: string };
      const data = QuestionSchema.partial().parse(request.body);

      // Verify ownership (Logical RLS)
      const existing = await prisma.question.findFirst({ 
        where: { id, guruId: user.id } 
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

  // DELETE Question (Ownership check enforced)
  fastify.delete("/:id", async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.question.findFirst({ 
      where: { id, guruId: user.id } 
    });

    if (!existing) {
      return reply.code(404).send({ error: "Soal tidak ditemukan atau Anda tidak memiliki akses" });
    }

    await prisma.question.delete({ where: { id } });
    return { success: true };
  });
}
