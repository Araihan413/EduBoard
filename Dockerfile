# ─── Base Stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ─── Prune Stage (Turborepo Pruner) ───────────────────────────────────────────
FROM base AS pruner
RUN pnpm add -g turbo
COPY . .
# Isolasi paket api dan dependensinya (termasuk @repo/db, @repo/types)
RUN turbo prune api --docker --out-dir=out

# ─── Installer Stage (Install dependencies) ───────────────────────────────────
FROM base AS installer
# Salin package.json dan lockfile yang sudah di-prune untuk pnpm caching
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# ─── Builder Stage (Build source code) ────────────────────────────────────────
FROM base AS builder
# Salin node_modules hasil instalasi
COPY --from=installer /app/ .
# Salin source code yang sudah di-prune
COPY --from=pruner /app/out/full/ .

# Generate Prisma Client sebelum mem-build (penting untuk type safety dan Prisma import)
RUN pnpm --filter @repo/db db:generate

# Build Fastify backend
RUN pnpm --filter api build

# ─── Runner Stage (Production server) ─────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=7860

# Salin seluruh workspace terkompilasi dari builder stage agar seluruh symlink pnpm tetap utuh
COPY --from=builder /app /app

EXPOSE 7860

# Jalankan backend API Fastify
CMD ["pnpm", "--filter", "api", "start"]
