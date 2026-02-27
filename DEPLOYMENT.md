# Deployment Runbook (Fly.io + SQLite)

This project is deployed on Fly.io and keeps SQLite persistent via Fly Volumes.

## Current App

- App name: `replyflow-vhnpouza`
- Region: `gru`
- Hostname: `https://replyflow-vhnpouza.fly.dev`
- Volume: `replyflow_data` mounted at `/app/data`

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

Example:

```bash
"/home/vtrpza/.fly/bin/flyctl" secrets set --app replyflow-vhnpouza \
  NEXTAUTH_SECRET=... \
  NEXTAUTH_URL=https://replyflow-vhnpouza.fly.dev \
  GOOGLE_CLIENT_ID=... \
  GOOGLE_CLIENT_SECRET=... \
  GOOGLE_REDIRECT_URI=https://replyflow-vhnpouza.fly.dev/api/auth/callback/google \
  GOOGLE_CONNECT_REDIRECT_URI=https://replyflow-vhnpouza.fly.dev/api/accounts/callback
```

## Deploy

```bash
"/home/vtrpza/.fly/bin/flyctl" deploy --app replyflow-vhnpouza --remote-only
```

## Verify

```bash
"/home/vtrpza/.fly/bin/flyctl" status --app replyflow-vhnpouza
"/home/vtrpza/.fly/bin/flyctl" logs --app replyflow-vhnpouza
```

Open:

- Landing: `https://replyflow-vhnpouza.fly.dev`
- Sign-in: `https://replyflow-vhnpouza.fly.dev/app/signin`

## OAuth Callbacks (Google Cloud Console)

Authorized redirect URIs:

- `https://replyflow-vhnpouza.fly.dev/api/auth/callback/google`
- `https://replyflow-vhnpouza.fly.dev/api/accounts/callback`

## Operational Notes

- Keep **single active machine** for SQLite safety.
- Database is persisted in Fly volume (`/app/data/gitjobs.db`).
- Do not rely on container filesystem outside the mounted volume.
