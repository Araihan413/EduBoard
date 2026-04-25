import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";

const LoginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const RegisterSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter").max(50, "Nama terlalu panjang"),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // LOGIN
  fastify.post("/login", async (request, reply) => {
    try {
      const { email, password } = LoginSchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: "Email atau password salah" });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return reply.code(401).send({ error: "Email atau password salah" });
      }

      const token = fastify.jwt.sign({ id: user.id, email: user.email });
      
      return { 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email 
        } 
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: err.errors[0].message });
      }
      return reply.code(500).send({ error: "Terjadi kesalahan pada server" });
    }
  });

  // REGISTER
  fastify.post("/register", async (request, reply) => {
    try {
      const { email, password, name } = RegisterSchema.parse(request.body);

      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(400).send({ error: "Email sudah terdaftar" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { 
          email, 
          passwordHash, 
          name 
        }
      });

      const token = fastify.jwt.sign({ id: user.id, email: user.email });

      return { 
        success: true, 
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: err.errors[0].message });
      }
      console.error(err);
      return reply.code(500).send({ error: "Gagal mendaftarkan akun" });
    }
  });
}
