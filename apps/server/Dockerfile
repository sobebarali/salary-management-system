# syntax=docker/dockerfile:1
# Build context is the repo root (see docker-compose.prod.yml), not apps/server,
# because the Bun workspace needs the whole monorepo to resolve workspace/catalog deps.

# --- builder: compile the Hono server into one self-contained binary ---
FROM oven/bun:1.3.5 AS builder
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

# `bun build --compile` bundles every dependency (Hono, Drizzle, pg, Better-Auth,
# oRPC, evlog) into a single executable, so the runtime image needs no node_modules.
RUN cd apps/server \
  && bun build --compile --minify --sourcemap ./src/index.ts --outfile /app/server-bin

# --- runtime: just the binary on a minimal glibc base ---
FROM debian:bookworm-slim AS runner
WORKDIR /app

# ca-certificates lets the binary open TLS connections to a managed Postgres
# (e.g. a provider that requires sslmode=require).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 appuser

COPY --from=builder /app/server-bin ./server-bin

USER appuser
ENV NODE_ENV=production
EXPOSE 3000
CMD ["./server-bin"]
