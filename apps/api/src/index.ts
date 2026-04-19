import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import { prisma } from "@repo/db";

import fastifyJwt from "@fastify/jwt";
import authRoutes from "./routes/auth";
import questionRoutes from "./routes/questions";
import { handleSocketEvents } from "./socket/gameManager";

const fastify = Fastify({ logger: true });

// Register Plugins
fastify.register(cors, {
  origin: ["http://localhost:3000"],
  credentials: true,
});

fastify.register(fastifyJwt, {
  secret: "supersekretkeyygdijagabenerbener", // In prod, use process.env.JWT_SECRET
});

fastify.get("/health", async () => {
  return { status: "ok" };
});

fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(questionRoutes, { prefix: "/api/questions" });

const start = async () => {
  try {
    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    
    // Initialize Socket.io attached to Fastify's raw server
    const io = new Server(fastify.server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      handleSocketEvents(io, socket);
    });

    console.log("Server and Socket.io started on port 4000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
