import { createClient } from "@supabase/supabase-js";
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@repo/db";
import * as dotenv from "dotenv";
import * as path from "path";

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// Load apps/web/.env.local if available
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase credentials in backend!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function verifySupabaseAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.substring(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return reply.code(401).send({ error: "Invalid token" });
    }

    const sbUser = data.user;

    // Check if user exists in Prisma
    let dbUser = await prisma.user.findUnique({
      where: { id: sbUser.id }
    });

    // Just-in-Time Provisioning: If user doesn't exist in Prisma DB, create them
    if (!dbUser) {
      const email = sbUser.email || "";
      const name = sbUser.user_metadata?.full_name || email.split("@")[0] || "User";
      
      // Upsert to handle edge cases where email might already exist with a different ID
      // But ideally ID should be consistent
      dbUser = await prisma.user.upsert({
        where: { id: sbUser.id },
        update: { name, email },
        create: {
          id: sbUser.id,
          email,
          name,
          passwordHash: "supabase-auth", // placeholder for Supabase users
        }
      });
    }

    // Attach user to request
    (request as any).user = { id: dbUser.id, email: dbUser.email, name: dbUser.name };
  } catch (err) {
    console.error("Auth verification error:", err);
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
