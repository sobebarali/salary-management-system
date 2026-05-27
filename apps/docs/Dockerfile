# syntax=docker/dockerfile:1
# Build context is the repo root, not apps/docs, because the Astro build resolves
# workspace/catalog deps (and the shared lockfile) from the whole monorepo.

# --- builder: produce the static Starlight site ---
FROM oven/bun:1.3.5 AS builder
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

RUN bun run --filter docs build

# --- runtime: serve the static site ---
FROM nginx:alpine AS runner
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/docs/dist /usr/share/nginx/html
EXPOSE 80
