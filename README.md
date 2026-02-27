# ReplyFlow

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![SQLite + Drizzle](https://img.shields.io/badge/SQLite-Drizzle-003B57?logo=sqlite)
![Fly.io](https://img.shields.io/badge/Fly.io-deployed-8B5CF6?logo=flydotio)

> **Stop applying blindly. Start getting interviews.**

ReplyFlow is a job-search framework for Brazilian mid-to-senior developers. It combines sourcing intelligence, recruiter CRM, ATS pipeline tracking, and Gmail-powered outreach into a single system — so you can treat outdated listings as recruiter leads and still track ATS submissions in the same workflow.

> Jobs intelligence + CRM + ATS + outreach in one system.

## Screenshots

<!-- TODO: Add product screenshots here -->

_Screenshots coming soon._

## Features

### Jobs Intelligence

Source opportunities from GitHub repos, Greenhouse boards, and Lever postings. Each job card surfaces a weighted match score with full explainability — top reasons for the match, missing skills, and a score breakdown — so you know exactly why a role fits (or doesn't) before spending time on it.

### Recruiter CRM

Contacts are automatically enriched from job syncs and email reveals with first/last seen timestamps, linked job count, and company context. Browse, filter, and export your contact bank as CSV, or compose follow-ups directly from any contact card.

### ATS Pipeline Tracking

ATS-only roles (Greenhouse, Lever) are first-class pipeline stages — track submission status alongside direct-outreach opportunities without switching tools or losing context.

### Direct Outreach Engine

Draft cold emails in PT-BR or EN using customizable templates, send via your connected Gmail account with CV attachment support, and track follow-ups with per-contact outreach history.

### Profile Scoring

A completeness score with band classification (`low` | `medium` | `high`) surfaces missing profile fields and actionable suggestions in Settings, ensuring your profile is ready before outreach begins.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Language | TypeScript 5 |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Auth | NextAuth v5 (JWT sessions) |
| Email | Gmail API (provider abstraction) |
| Monitoring | Sentry |
| Deployment | Fly.io (Docker + persistent volume) |
| i18n | PT-BR + EN |

## Quick Start

1. **Clone and install**

```bash
git clone <repo-url> && cd gitjobs-v2
npm install
```

2. **Configure environment** — copy `.env.example` to `.env` and fill in required values

3. **Run migrations**

```bash
npm run db:migrate
```

4. **Start the dev server**

```bash
npm run dev
```

Optionally, seed demo data:

```bash
npm run db:seed              # seed source ecosystem/bootstrap data
npm run db:seed-profile      # seed a sample profile
npm run db:seed-templates    # seed default outreach templates
npm run db:backfill-contacts # optional: backfill contacts from existing jobs
npm run db:backfill-contract-types # normalize contract_type for existing jobs
npm run db:cleanup-generic-contacts # remove generic/non-direct job_sync contacts from CRM
```

## Data Quality Rules

- Dashboard uses `jobsWithEmail` / `jobsWithDirectEmail` as **jobs with scraped email present**.
- `ATS-only` means `apply_url` exists and no scraped contact email exists.
- `contract_type` is normalized for all jobs (no `NULL`/`Unknown` bucket in storage):
  - National-context jobs default to `CLT`.
  - International-source jobs default to `PJ` when no explicit contract signal exists.
- Generic emails (for example `noreply`, `support`, `accommodation`) are filtered from recruiter-CRM sync.

## Project Structure

```
src/
├── app/
│   ├── api/               # API route handlers
│   │   ├── accounts/      # Gmail OAuth connection
│   │   ├── contacts/      # Recruiter CRM endpoints
│   │   ├── emails/        # Send + history
│   │   ├── jobs/          # Listings, match, reveal
│   │   ├── outreach/      # Draft, send, track
│   │   ├── profile/       # User profile + scoring
│   │   ├── sources/       # Source connectors CRUD
│   │   ├── stats/         # Dashboard analytics
│   │   ├── sync/          # Manual + system sync
│   │   └── templates/     # Email templates
│   ├── app/               # Authenticated app pages
│   │   ├── compose/       # Email composer
│   │   ├── history/       # Sent email history
│   │   ├── jobs/          # Job board
│   │   ├── outreach/      # Outreach pipeline
│   │   └── settings/      # Profile & preferences
│   └── (marketing)/       # Public landing + legal pages
├── components/
│   ├── dashboard/         # Dashboard widgets
│   ├── jobs/              # Job card & list components
│   ├── outreach/          # Outreach UI components
│   └── ui/                # Shared UI primitives
└── lib/
    ├── auth/              # Auth helpers
    ├── contacts/          # Contact enrichment logic
    ├── db/                # Schema, migrations, seeds
    ├── i18n/              # Internationalization
    ├── matcher/           # Job-profile matching engine
    ├── outreach/          # Outreach generation
    ├── parser/            # Job description parser
    ├── plan/              # Plan enforcement logic
    ├── profile/           # Profile scoring
    ├── providers/         # Email provider abstraction
    ├── scraper/           # Job scraping utilities
    ├── sources/           # Source connector implementations
    └── types/             # Shared TypeScript types
```

## Source Connectors

| Type | Description | Example |
|---|---|---|
| `github_repo` | Scrapes job listings from GitHub repository issues/files | `frontendbr/vagas` |
| `greenhouse_board` | Fetches open positions from a Greenhouse job board | `company.greenhouse.io` |
| `lever_postings` | Fetches open positions from a Lever careers page | `jobs.lever.co/company` |

Sources support auto-discovery from a curated BR/LATAM ecosystem list. Each source tracks health status (`healthy` | `warning` | `critical`) computed from sync outcomes, which drives throttling and retry behavior.

## API Reference

<details>
<summary>Click to expand the full endpoint list</summary>

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Database connectivity check |
| GET, POST | `/api/auth/[...nextauth]` | NextAuth sign-in, sign-out, callbacks |
| GET | `/api/accounts` | List connected email accounts |
| POST | `/api/accounts` | Connect, disconnect, or set default account |
| GET | `/api/accounts/callback` | Gmail OAuth2 callback |
| GET | `/api/contacts` | List contacts (filterable, CSV export) |
| POST | `/api/contacts` | Create contact or save from job reveal |
| PATCH | `/api/contacts/[id]` | Update contact details |
| DELETE | `/api/contacts/[id]` | Delete contact |
| GET | `/api/jobs` | List jobs with filters, pagination, match scores |
| PATCH | `/api/jobs` | Update job outreach status |
| POST | `/api/jobs/match` | Recalculate match scores for all jobs |
| POST | `/api/jobs/reveal` | Reveal recruiter contact for a job |
| GET | `/api/emails/history` | Sent email history |
| POST | `/api/emails/send` | Send email via connected account |
| GET | `/api/outreach` | List outreach records |
| POST | `/api/outreach` | Draft cold email for a job |
| PATCH | `/api/outreach` | Update outreach record |
| PUT | `/api/outreach` | Send outreach email with CV attachment |
| GET | `/api/profile` | Get profile with scoring |
| PUT | `/api/profile` | Update profile and recalculate scores |
| GET | `/api/sources` | List sources (filterable by type/status) |
| POST | `/api/sources` | Add new source |
| PATCH | `/api/sources/[id]` | Update source settings |
| POST | `/api/sources/[id]/validate` | Validate source connectivity |
| POST | `/api/telemetry/plan-intent` | Record plan-intent telemetry events |
| GET | `/api/templates` | List email templates |
| POST | `/api/templates` | Create email template |
| GET | `/api/templates/[id]` | Get template by ID |
| PUT | `/api/templates/[id]` | Update template |
| DELETE | `/api/templates/[id]` | Delete template |
| GET | `/api/stats` | Dashboard analytics |
| POST | `/api/sync` | Manual sync |
| POST | `/api/sync/system` | System-level sync (token-protected) |
| POST | `/api/billing/checkout` | Start Asaas hosted recurring checkout (Pro) |
| GET | `/api/billing/state` | Read billing/subscription state for current user |
| POST | `/api/billing/subscription/cancel` | Cancel current subscription at period end |
| POST | `/api/billing/webhooks/asaas` | Asaas webhook ingestion (requires `asaas-access-token`) |
| POST | `/api/billing/reconcile/system` | Billing reconciliation endpoint (token-protected) |

</details>

## Billing Notes

- Billing provider is Asaas with hosted recurring checkout (credit card only for MVP).
- Webhook endpoint is fail-closed: `ASAAS_WEBHOOK_TOKEN` is required and invalid requests are rejected.
- Entitlement projection is based on the best valid subscription state (active/grace/cancel-at-period-end), not simply the newest row.

## Deployment

ReplyFlow runs on **Fly.io** with a persistent SQLite volume, Docker-based builds, CI/CD quality gates (typecheck + build), scheduled source sync, and automated backups. Migrations execute automatically on container startup.

```bash
flyctl deploy -a replyflow
```

See the full operational runbook, secrets reference, and post-deploy checklist in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Build Troubleshooting

### JavaScript heap out of memory during `next build`

If your logs show errors like:

- `Ineffective mark-compacts near heap limit`
- `Allocation failed - JavaScript heap out of memory`
- `Next.js build worker exited ... SIGABRT`

the build hit Node.js heap limits during the production bundle step.

Run the build with a larger heap locally:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

Deploy note: Fly remote Docker builds in this project already set `NODE_OPTIONS=--max-old-space-size=4096` in the Docker build stage.

## Plans

| | Free (R$ 0) | Pro (R$ 39/mo) |
|---|---|---|
| Enabled sources | Unlimited | Unlimited |
| ATS sources | Unlimited | Unlimited |
| Manual syncs/day | Unlimited | Unlimited |
| Source validations/day | Unlimited | Unlimited |
| Contact reveals | 50/month | Unlimited |
| Draft generations | 30/month | Unlimited |
| Sends | 10/month | Unlimited |
| Connected accounts | 1 | Unlimited |
| Email history | 30 items | Full |

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution standards, versioning policy, and code conventions.

## License

Private. All rights reserved.
