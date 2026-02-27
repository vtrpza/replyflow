# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Added

- Multi-tenant plan/usage model (`user_plan`, `usage_counters`, `job_reveals`, `job_match_scores`).
- `POST /api/jobs/reveal` endpoint for direct contact reveal flow.
- Server-side plan enforcement helper module.
- Protected/public app route groups for server-side auth gating.
- Plan/usage UI blocks in settings with upgrade CTA.

### Changed

- User profile and outreach records moved from global to per-user isolation.
- Jobs API now returns per-user `outreachStatus` and `matchScore`.
- Free plan now masks contact details until reveal.
- Landing "Upgrade to Pro" CTA now points to `/app/settings`.

### Fixed

- Removed cross-user leakage in outreach/profile/account-related paths.
- Scoped connected email account reads and writes by authenticated user.
- Standardized upgrade limit response as HTTP `402` with `upgrade_required` payload.
