import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, QuestionType } from "@repo/db";
import { QuestionSchema } from "@repo/types";

export default async function questionRoutes(fastify: FastifyInstance) {
  // Authentication Guard!
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // GET All Questions for a Teacher
  fastify.get("/", async (request, reply) => {
    const user = request.user as { id: string };
    const questions = await prisma.question.findMany({
      where: { guruId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    return questions;
  });

  // POST New Question
  fastify.post("/", async (request, reply) => {
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
  });

  // PUT Update Question
  fastify.put("/:id", async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };
    const data = QuestionSchema.partial().parse(request.body);

    // Verify ownership
    const existing = await prisma.question.findUnique({ where: { id }});
    if (!existing || existing.guruId !== user.id) {
      return reply.code(403).send({ error: "Forbidden" });
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
  });

  // DELETE Question
  fastify.delete("/:id", async (request, reply) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.question.findUnique({ where: { id }});
    if (!existing || existing.guruId !== user.id) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    await prisma.question.delete({ where: { id } });
    return { success: true };
  });
}
