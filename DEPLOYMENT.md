# Deployment Runbook (Fly.io + SQLite)

This project is deployed on Fly.io and keeps SQLite persistent via Fly Volumes.

## Current App

- App name: `replyflow`
- Region: `gru`
- Hostname: `https://replyflow.fly.dev`
- Volume: `replyflow_data` mounted at `/data`

## Why Fly.io

- Supports Node apps with persistent disks.
- Works with `better-sqlite3` without migrating to external database.
- Allows simple single-instance operation (recommended for SQLite).

## Required Fly Secrets

Set these in Fly:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CONNECT_REDIRECT_URI`
- `GITHUB_TOKEN` (optional, for scraping with higher API quota)
- `REPLYFLOW_SYNC_TOKEN` (required, protects `/api/sync/system`)

Example:

```bash
"/home/vtrpza/.fly/bin/flyctl" secrets set -a replyflow \
  NEXTAUTH_SECRET=... \
  NEXTAUTH_URL=https://replyflow.fly.dev \
  GOOGLE_CLIENT_ID=... \
  GOOGLE_CLIENT_SECRET=... \
  GOOGLE_REDIRECT_URI=https://replyflow.fly.dev/api/auth/callback/google \
  GOOGLE_CONNECT_REDIRECT_URI=https://replyflow.fly.dev/api/accounts/callback \
  REPLYFLOW_SYNC_TOKEN=replace-with-long-random-token
```

## Deploy

Migrations run automatically on container startup via `docker-entrypoint.js`.

```bash
"/home/vtrpza/.fly/bin/flyctl" deploy -a replyflow
```

## Verify

```bash
"/home/vtrpza/.fly/bin/flyctl" status -a replyflow
"/home/vtrpza/.fly/bin/flyctl" logs -a replyflow
```

Open:

- Landing: `https://replyflow.fly.dev`
- Sign-in: `https://replyflow.fly.dev/app/signin`

## Scheduled Sync (System Endpoint)

Use `POST /api/sync/system` for automated source syncing/discovery.

Requirements:

- Header: `x-replyflow-sync-token: <REPLYFLOW_SYNC_TOKEN>`
- Env var must be configured in runtime: `REPLYFLOW_SYNC_TOKEN`

Example:

```bash
curl -X POST "https://replyflow.fly.dev/api/sync/system" \
  -H "x-replyflow-sync-token: $REPLYFLOW_SYNC_TOKEN"
```

## OAuth Callbacks (Google Cloud Console)

Authorized redirect URIs:

- `https://replyflow.fly.dev/api/auth/callback/google`
- `https://replyflow.fly.dev/api/accounts/callback`

## Operational Notes

- Keep **single active machine** for SQLite safety.
- Keep at least **one machine always running** (disable autostop) to avoid cold starts.
- Database is persisted in Fly volume (`/data/gitjobs.db`).
- The `DATABASE_PATH` env var is set to `/data/gitjobs.db` in `fly.toml` under `[env]`.
- Migrations use `better-sqlite3` directly (not `drizzle-kit` CLI) to avoid libsql driver conflicts.
- Do not rely on container filesystem outside the mounted volume.
