import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";

// Minimal auth routes manually typed for now
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/login", async (request, reply) => {
    const { email, password } = LoginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(400).send({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return reply.code(400).send({ error: "Invalid credentials" });
    }

    // Usually we would sign a JWT here. Using mock token for now until jwt is plugged fully.
    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  });

  // Mock register
  fastify.post("/register", async (request, reply) => {
    const { email, password, name } = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(2),
    }).parse(request.body);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name }
    });

    return { success: true, userId: user.id };
  });
}
