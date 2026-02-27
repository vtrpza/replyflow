# ReplyFlow

ReplyFlow is a job-search framework for Brazilian mid-to-senior developers.

It combines sourcing/ATS intelligence, recruiter CRM, Gmail-powered outreach, and deterministic pipelines so you can treat outdated listings as recruiter leads and still track ATS submissions in the same system.

The core workflow:

- gather opportunities from GitHub repos (plus soon ATS connectors) with freshness and contact scoring;
- prioritize by match/freshness/contact type (direct vs ATS) and mark stale ones to save recruiter leads;  
- track ATS-only roles as pipeline stages while still generating drafts when direct contacts are available;  
- sync recruiter emails into the built-in contacts table and export CSV/compose follow-ups directly from that bank;
- monitor recruiter-email unique counts, ATS share, and outreach KPIs on the dashboard.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Drizzle ORM + SQLite (`better-sqlite3`)
- NextAuth v5 (JWT sessions)
- Gmail API (provider abstraction)

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Configure env vars (copy `.env.example` to `.env` and fill required values)

3. Run migrations

```bash
npm run db:migrate
```

4. Start the app

```bash
npm run dev
```

## Scripts

```bash
# app
npm run dev
npm run build
npm run start

# database
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed-profile

# lint
npm run lint
```

## Product Rules Implemented

- Multi-tenant isolation for profile, outreach, match scores, reveals, usage counters.
- Auth required on user-scoped APIs.
- Free vs Pro enforcement server-side with standardized `402 upgrade_required` responses.
- Route-group server gating for `/app/*`.
- Job searchable data tracked in `/api/jobs`, `/api/stats`, and `/api/sync`, with opportunity scoring, freshness filters, and staleness awareness.
- Recruiter CRM APIs under `/api/contacts` (GET/POST + CSV export) and `/api/contacts/[id]` for updates/deletes, plus automatic ingestion from job syncs and reveals.
*- Compose draft and send flows leverage `/api/outreach` + `/api/emails/send`, and the new contacts bank can prefill recipients via `/app/compose?to=...`.

## Versioning & Release Policy

This repository follows Semantic Versioning and conventional commit guidelines.

- Versioning policy: `VERSIONING.md`
- Contribution standards: `CONTRIBUTING.md`
- Release history: `CHANGELOG.md`

## Security Notes

- Never commit `.env` files or real credentials.
- OAuth tokens are user-scoped and persisted in the database.
- Free-plan limits are enforced on the backend (not only in UI).

## Deploy (SQLite without migration to external DB)

This project is configured to run on **Fly.io** with persistent volume storage for SQLite.

- Config file: `fly.toml`
- Volume mount path: `/data`
- SQLite file path in app runtime: `/data/gitjobs.db` (set via `DATABASE_PATH` env var)
- Generated Docker files: `Dockerfile`, `docker-entrypoint.js`, `.dockerignore`
- Migrations run automatically on container startup

Quick deploy:

```bash
"/home/vtrpza/.fly/bin/flyctl" deploy -a replyflow
```

Required secrets (Fly):

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CONNECT_REDIRECT_URI`

Google OAuth callback URLs must include:

- `https://<your-app>.fly.dev/api/auth/callback/google`
- `https://<your-app>.fly.dev/api/accounts/callback`

See full operational runbook: `DEPLOYMENT.md`.
