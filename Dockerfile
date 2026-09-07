# Stage 1: builder — full dependency tree, runs the actual Next.js build.
# Needs no env vars: env.ts exposes required vars as getters (not top-level
# calls) and almost every route is server-rendered on demand, so nothing
# reads them during `next build` (confirmed by running the build with none
# present). Discarded entirely except for what the runner stage copies out.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: runner — only the pruned standalone output, none of builder's
# full node_modules or source tree.
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# output: "standalone" (next.config.ts) traces exactly what's needed to run
# and puts it here; .next/static and public/ are deliberately excluded from
# that trace and copied back in separately (same as scripts/start-prod.sh
# does for the non-Docker path).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
