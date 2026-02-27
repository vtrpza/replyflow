# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Added

- Plan-intent telemetry pipeline:
  - `plan_intent_events` table + migration `drizzle/0003_plan_intent_events.sql`
  - telemetry endpoint `POST /api/telemetry/plan-intent`
  - event tracking for core actions and `upgrade_required` blockers
  - metrics helper for free-plan active-user and upgrade-intent-rate analysis
- Email templates feature with database schema (`email_templates` table).
- Email templates API endpoints (`GET/POST /api/templates`, `GET/PUT/DELETE /api/templates/[id]`).
- Seeded default email templates (10 templates: 5 EN, 5 PT-BR) for outreach workflow.
- Template selector UI in Outreach page OperatorSheet.
- Template selection with preview and replace confirmation.
- Research-backed cold email templates optimized for developer outreach.
- Smithery MCP integration for copywriting research.
- davila7 copywriting and email-sequence skills installed.
- Data maintenance scripts:
  - `npm run db:backfill-contract-types`
  - `npm run db:cleanup-generic-contacts`

### Changed

- Free-tier source access now matches Pro for source ingestion:
  - unlimited enabled sources
  - unlimited ATS sources
  - unlimited manual syncs/day
  - unlimited source validations/day
- Source/sync UI messaging updated to remove stale free-tier source quota upgrade copy.
- Landing page hero and CTA copy updated with benefit-driven messaging.
- Landing page CTAs changed from "Open app" to "Start free".
- Dashboard simplified to KPI-first layout with less ambiguous terminology.
- Stats contract aggregation now enforces contract classification buckets without `Unknown` persistence.
- Contract inference now respects national/international context:
  - `CLT` only when national signals exist.
  - international-source fallback defaults to `PJ`.
- Contact metrics and ATS-only semantics clarified:
  - `jobsWithEmail` reflects jobs with scraped email present.
  - `ATS-only` reflects jobs with apply URL and no scraped email.

### Added (from previous)

- Multi-tenant plan/usage model (`user_plan`, `usage_counters`, `job_reveals`, `job_match_scores`).
- `POST /api/jobs/reveal` endpoint for direct contact reveal flow.
- Server-side plan enforcement helper module.
- Protected/public app route groups for server-side auth gating.
- Plan/usage UI blocks in settings with upgrade CTA.
- Fly.io deployment infrastructure (`fly.toml`, `Dockerfile`, entrypoint, deploy workflow).
- Deployment runbook for SQLite persistence on Fly (`DEPLOYMENT.md`).

### Changed

- User profile and outreach records moved from global to per-user isolation.
- Jobs API now returns per-user `outreachStatus` and `matchScore`.
- Free plan now masks contact details until reveal.
- Landing "Upgrade to Pro" CTA now points to `/app/settings`.

### Fixed

- Removed cross-user leakage in outreach/profile/account-related paths.
- Scoped connected email account reads and writes by authenticated user.
- Standardized upgrade limit response as HTTP `402` with `upgrade_required` payload.
- Sign-in flow now reuses canonical user by email to prevent `UNIQUE(users.email)` failures for returning users.
