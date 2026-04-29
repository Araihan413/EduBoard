import { FastifyInstance } from "fastify";
import { prisma } from "@repo/db";
import { QuestionSchema } from "@repo/types";
import { verifySupabaseAuth } from "../supabaseAuth";
import { z } from "zod";

export async function questionSetRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifySupabaseAuth);

  // Get all question sets for the current teacher + presets
  fastify.get("/", async (request, reply) => {
    const userId = (request.user as any).id;
    const { page = "1", limit = "12" } = request.query as { page?: string, limit?: string };

    const p = parseInt(page);
    const l = parseInt(limit);
    const skip = (p - 1) * l;

    const where = {
      OR: [
        { guruId: userId },
        { isPreset: true }
      ]
    };

    const [sets, total] = await Promise.all([
      prisma.questionSet.findMany({
        where,
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l
      }),
      prisma.questionSet.count({ where })
    ]);

    return {
      data: sets,
      meta: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      }
    };
  });

  // Create a new question set
  fastify.post("/", async (request, reply) => {
    const userId = (request.user as any).id;
    const { title, description } = request.body as any;

    const set = await prisma.questionSet.create({
      data: {
        title,
        description,
        guruId: userId
      }
    });
    return set;
  });

  // Get a specific set with its questions
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as any;
    const userId = (request.user as any).id;

    const set = await prisma.questionSet.findFirst({
      where: {
        id,
        OR: [
          { guruId: userId },
          { isPreset: true }
        ]
      },
      include: {
        questions: true
      }
    });

    if (!set) return reply.status(404).send({ message: "Paket soal tidak ditemukan" });
    return set;
  });

  // Duplicate a preset into teacher's collection
  fastify.post("/:id/duplicate", async (request, reply) => {
    const { id } = request.params as any;
    const userId = (request.user as any).id;

    const sourceSet = await prisma.questionSet.findUnique({
      where: { id },
      include: { questions: true }
    });

    if (!sourceSet) return reply.status(404).send({ message: "Sumber paket tidak ditemukan" });

    const newSet = await prisma.questionSet.create({
      data: {
        title: `${sourceSet.title} (Salinan)`,
        description: sourceSet.description,
        guruId: userId,
        questions: {
          create: sourceSet.questions.map(q => ({
            type: q.type,
            text: q.text,
            options: q.options || undefined,
            answerKey: q.answerKey,
            points: q.points
          }))
        }
      },
      include: { questions: true }
    });

    return newSet;
  });

  // Delete a set
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as any;
    const userId = (request.user as any).id;

    const set = await prisma.questionSet.findFirst({
      where: { id, guruId: userId }
    });

    if (!set) return reply.status(404).send({ message: "Paket tidak ditemukan atau Anda tidak memiliki akses" });

    await prisma.questionSet.delete({ where: { id } });
    return { success: true };
  });

  // Update a question set
  fastify.put("/:id", async (request, reply) => {
    const { id } = request.params as any;
    const { title, description } = request.body as any;
    const userId = (request.user as any).id;

    const updated = await prisma.questionSet.update({
      where: { id, guruId: userId },
      data: { title, description }
    });

    return updated;
  });

  // Import questions to a set
  fastify.post("/:id/import", async (request, reply) => {
    const { id } = request.params as any;
    const { questions } = request.body as any;
    const userId = (request.user as any).id;

    if (!Array.isArray(questions)) {
      return reply.status(400).send({ error: "Invalid questions data" });
    }

    const set = await prisma.questionSet.findFirst({
      where: { id, guruId: userId }
    });

    if (!set) return reply.status(404).send({ error: "Set not found" });

    try {
      const validatedQuestions = questions.map((q: any) => QuestionSchema.parse(q));

      const created = await prisma.question.createMany({
        data: validatedQuestions.map((q: any) => ({
          ...q,
          setId: id
        }))
      });

      return { success: true, count: created.count };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "Beberapa soal tidak valid", details: err.errors });
      }
      return reply.status(500).send({ error: "Gagal mengimport soal" });
    }
  });
}
