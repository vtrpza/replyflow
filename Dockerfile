# syntax = docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Build ----
FROM base AS build
ARG SENTRY_AUTH_TOKEN
ARG SKIP_BUILD_VALIDATION=0
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
ARG NEXT_PUBLIC_APP_VERSION=dev
ARG NEXT_PUBLIC_PRE_RELEASE=false
ARG NEXT_PUBLIC_BILLING_ENABLED=false

# Needed for native modules (better-sqlite3) during install.
RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
  rm -rf /var/lib/apt/lists/*

COPY package-lock.json package.json ./
RUN npm ci

COPY . .

# Prevent Next.js production build OOM in constrained build environments.
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV SKIP_BUILD_VALIDATION=$SKIP_BUILD_VALIDATION
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_PRE_RELEASE=$NEXT_PUBLIC_PRE_RELEASE
ENV NEXT_PUBLIC_BILLING_ENABLED=$NEXT_PUBLIC_BILLING_ENABLED

# Build Next.js (standalone) and a tiny prod CLI for migrations.
RUN SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN" npm run build && npm run build:cli

# Keep only runtime deps before copying node_modules into the final image.
RUN npm prune --omit=dev

# ---- Runner ----
FROM base AS runner

ENV NODE_ENV=production

# Copy the standalone server output.
COPY --from=build /app/.next/standalone /app
COPY --from=build /app/.next/static /app/.next/static
COPY --from=build /app/public /app/public

# Runtime migration CLI depends on these packages being present.
COPY --from=build /app/node_modules /app/node_modules

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
