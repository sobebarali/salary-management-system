# syntax=docker/dockerfile:1
# Build context is the repo root (see docker-compose.prod.yml), not apps/web,
# because the Vite build imports workspace packages (ui, api types, env).

# --- builder: produce the static SPA bundle ---
FROM oven/bun:1.3.5 AS builder
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

# VITE_SERVER_URL is inlined into the bundle at build time (Vite replaces
# import.meta.env.VITE_*), so it must be a build ARG — a runtime container env
# var would never reach the already-built static files. It is the public origin
# the browser calls for /rpc and /api/auth, so it must match the deployed server.
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN bun run --filter web build

# --- runtime: serve the static bundle ---
FROM nginx:alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
