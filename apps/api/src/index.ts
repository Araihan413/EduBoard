import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import { prisma } from "@repo/db";
import * as dotenv from "dotenv";
import * as path from "path";

import fastifyJwt from "@fastify/jwt";
import authRoutes from "./routes/auth";
import questionRoutes from "./routes/questions";
import roomRoutes from "./routes/rooms";
import { questionSetRoutes } from "./routes/questionSets";
import { handleSocketEvents } from "./socket/gameManager";

// ─── Load Environment Variables ───────────────────────────────────────────────
// Priority: apps/api/.env → root .env (fallback for local dev)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ─── Validate Required Environment Variables ──────────────────────────────────
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error(
    "[FATAL] JWT_SECRET environment variable is not set. " +
    "Generate one with: openssl rand -base64 32"
  );
  process.exit(1);
}

const port = parseInt(process.env.PORT || "4000", 10);

// CORS_ORIGIN: comma-separated list of allowed origins for production.
// Example: "https://eduboard.vercel.app,https://www.eduboard.com"
// In development, defaults to localhost:3000.
const corsOrigins: string | string[] | boolean = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : "http://localhost:3000";

// ─── Fastify Instance ─────────────────────────────────────────────────────────
const fastify = Fastify({ logger: true });

// Register Plugins
fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

fastify.register(fastifyJwt, {
  secret: jwtSecret,
});

fastify.get("/health", async () => {
  return { status: "ok" };
});

fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(questionRoutes, { prefix: "/api/questions" });
fastify.register(roomRoutes, { prefix: "/api/rooms" });
fastify.register(questionSetRoutes, { prefix: "/api/sets" });

// Gracefully disconnect Prisma Client on Fastify shutdown
fastify.addHook("onClose", async (instance) => {
  instance.log.info("Menutup koneksi database Prisma...");
  await prisma.$disconnect();
});

const start = async () => {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });

    // Initialize Socket.io attached to Fastify's raw server
    const io = new Server(fastify.server, {
      cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      handleSocketEvents(io, socket);
    });

    console.log(`Server and Socket.io started on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
