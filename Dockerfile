# syntax = docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Build ----
FROM base AS build

# Needed for native modules (better-sqlite3) during install.
RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
  rm -rf /var/lib/apt/lists/*

COPY package-lock.json package.json ./
RUN npm ci

COPY . .

# Build Next.js (standalone) and a tiny prod CLI for migrations.
RUN npm run build && npm run build:cli

# ---- Runner ----
FROM base AS runner

ENV NODE_ENV=production

# Copy the standalone server output.
COPY --from=build /app/.next/standalone /app
COPY --from=build /app/.next/static /app/.next/static
COPY --from=build /app/public /app/public

# Copy DB migrations and CLI migration runner.
COPY --from=build /app/drizzle /app/drizzle
COPY --from=build /app/dist-cli /app/dist-cli

# Copy data catalog files for source auto-discovery.
COPY --from=build /app/data /app/data

COPY --from=build /app/docker-entrypoint.js /app/docker-entrypoint.js

RUN rm -f /app/.env /app/.env.* || true

EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.js"]
CMD ["node", "server.js"]
