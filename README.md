# ReplyFlow

ReplyFlow is an outreach CRM for developers applying to jobs.

It aggregates opportunities from GitHub issue-based job boards, helps generate targeted drafts, sends via connected Gmail accounts, and tracks the pipeline end-to-end.

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

## Versioning & Release Policy

This repository follows Semantic Versioning and conventional commit guidelines.

- Versioning policy: `VERSIONING.md`
- Contribution standards: `CONTRIBUTING.md`
- Release history: `CHANGELOG.md`

## Security Notes

- Never commit `.env` files or real credentials.
- OAuth tokens are user-scoped and persisted in the database.
- Free-plan limits are enforced on the backend (not only in UI).
