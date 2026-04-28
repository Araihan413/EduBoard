import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import { prisma } from "@repo/db";

import fastifyJwt from "@fastify/jwt";
import authRoutes from "./routes/auth";
import questionRoutes from "./routes/questions";
import roomRoutes from "./routes/rooms";
import { questionSetRoutes } from "./routes/questionSets";
import { handleSocketEvents } from "./socket/gameManager";

const fastify = Fastify({ logger: true });

// Register Plugins
// Register Plugins
fastify.register(cors, {
  origin: true, 
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "supersekretkeyygdijagabenerbener", 
});

fastify.get("/health", async () => {
  return { status: "ok" };
});

fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(questionRoutes, { prefix: "/api/questions" });
fastify.register(roomRoutes, { prefix: "/api/rooms" });
fastify.register(questionSetRoutes, { prefix: "/api/sets" });

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
