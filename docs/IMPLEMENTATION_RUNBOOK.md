# Implementation Runbook

## Scope Delivered

This codebase now includes the following product capabilities:

1. Sources management UI with enable/disable/create/validate actions.
2. Source health scoring (healthy/warning/critical) with throttling.
3. Connector support for GitHub Issues, Greenhouse Job Board, and Lever Postings.
4. Attribution and Terms-of-Service metadata/guardrails per source.
5. Matcher explainability on jobs (reasons, missing skills, weighted breakdown).
6. Tooltips for user orientation in key UI surfaces.
7. Dynamic contact-bank enrichment from gathered recruiter emails.
8. Discovery/automation for source expansion (BR/LATAM/intl-latam-friendly).
9. Profile scoring persisted and shown in Settings.
10. Stale profile-score auto-heal on profile GET.

## Data Model and Migration

### Added/extended schema fields

- `jobs`
  - `source_id`, `source_type`, `external_job_id`
- `repo_sources`
  - connector/compliance/health/scheduling/discovery fields:
  - `source_type`, `display_name`, `external_key`
  - `attribution_label`, `attribution_url`, `terms_url`, `terms_accepted_at`
  - `health_score`, `health_status`, `health_breakdown_json`
  - `consecutive_failures`, `last_success_at`, `last_error_at`, `last_error_code`, `last_error_message`
  - `sync_interval_minutes`, `next_sync_at`, `throttled_until`
  - `auto_discovered`, `discovery_confidence`, `region_tags_json`
- `source_sync_runs`
  - new table for source-level and global sync execution metadata
- `job_match_scores`
  - `reasons_json`, `missing_skills_json`, `breakdown_json`
- `contacts`
  - `first_seen_at`, `last_seen_at`, `jobs_count`
  - `last_job_id`, `last_job_title`, `last_company`, `last_source_type`
  - `source_history_json`
- `user_profile`
  - `profile_score`, `profile_score_band`
  - `profile_score_missing`, `profile_score_suggestions`, `profile_score_updated_at`

### Migration files

- `drizzle/0001_sources_connectors_explainability.sql`
- `drizzle/meta/_journal.json` updated with `0001_sources_connectors_explainability`

## Source Connectors and Discovery

### Connector implementations

- `src/lib/sources/connectors/github-issues.ts`
- `src/lib/sources/connectors/greenhouse-board.ts`
- `src/lib/sources/connectors/lever-postings.ts`
- registry in `src/lib/sources/connectors/index.ts`

### Policy and guardrails

- `src/lib/sources/policy.ts`
  - central attribution/terms policy map per source type

### Health scoring

- `src/lib/sources/health.ts`
  - weighted scoring dimensions:
  - fetch reliability, freshness, parsing quality, compliance, stability
  - outputs score + status + throttle minutes

### Discovery automation

- `src/lib/sources/discovery.ts`
  - GitHub ecosystem discovery from `data/brazilian-job-ecosystem.json`
  - ATS discovery from `data/international-ats-sources.json`
  - confidence-based auto-enable

### Curated ATS catalog

- `data/international-ats-sources.json`
  - greenhouse + lever source tokens for BR/LATAM/intl-latam-friendly coverage

## Sync Execution

### Core sync orchestrator

- `src/lib/sources/sync.ts`
  - global lock via `source_sync_runs`
  - per-source sync run persistence
  - source health updates and throttling
  - optional discovery and schedule enforcement
  - contact-email sync into user contacts

### APIs

- `POST /api/sync`
  - authenticated manual sync
  - supports source targeting and optional reparse
  - defaults `runDiscovery=true` when body omits it
- `POST /api/sync/system`
  - token-protected scheduler endpoint
  - header: `x-replyflow-sync-token`
  - env: `REPLYFLOW_SYNC_TOKEN`

## Sources API + UI

### API

- `GET /api/sources`
- `POST /api/sources`
- `PATCH /api/sources/[id]`
- `POST /api/sources/[id]/validate`

### UI

- `src/app/app/(protected)/sources/page.tsx`
  - source list + status badges
  - enable/disable
  - validate connector
  - add GitHub / Greenhouse / Lever source
  - terms/attribution visibility

## Matcher Explainability

- `src/lib/matcher/index.ts`
  - persists reasons, missing skills, weighted breakdown
- `src/app/api/jobs/route.ts`
  - enriches job payload with `matchExplain` + `source` metadata
- `src/app/app/(protected)/jobs/page.tsx`
  - renders reasons/missing skills and contextual tooltips

## Contact Bank Enrichment

### Upsert behavior

- `src/lib/contacts/upsert.ts`
  - email-keyed per-user upsert
  - tracks first/last seen, linked jobs count, last job/company/source, history

### Ingestion entry points

- source sync pipeline
- job reveal (`/api/jobs/reveal`)
- outreach draft flow (`/api/outreach`)

### One-time historical backfill

- `src/lib/db/backfill-contacts.ts`
- npm script: `npm run db:backfill-contacts`

## Profile Scoring

### Scoring engine

- `src/lib/profile/scoring.ts`
  - computes score, band, missing fields, suggestions

### API + UI

- `src/app/api/profile/route.ts`
  - `PUT` recalculates and persists profile score
  - `GET` now auto-heals stale/zero score rows
- `src/app/app/(protected)/settings/page.tsx`
  - displays score, band, suggestions with tooltip

## Navigation and i18n

- `src/components/ui/sidebar.tsx`
- `src/components/ui/mobile-tab-bar.tsx`
- `src/lib/i18n/index.tsx`
  - adds Sources navigation entries and labels

## Tooling and Ops

### Environment

- `.env.example`
  - adds `REPLYFLOW_SYNC_TOKEN`

### Deploy docs

- `DEPLOYMENT.md`
  - includes system-sync token flow

### Repo docs

- `README.md`
  - updated with connectors, explainability, and sync behavior

### Lint behavior

- ESLint ignores generated `dist-cli/**`
- `docker-entrypoint.js` made lint-compliant without broad ignore

## Commands

- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`
- Migrate: `npm run db:migrate`
- Contact backfill: `npm run db:backfill-contacts`

## Known Functional Notes

- ATS sources frequently return postings without recruiter emails.
  - This is expected and affects contact-bank growth.
- Contact-bank auto-fill depends on parsed/available `contactEmail`.
- Source health status may become `critical` for invalid ATS tokens (404).
