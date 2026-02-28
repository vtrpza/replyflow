<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into **ReplyFlow** (Next.js 16 App Router). PostHog is now initialized client-side via `instrumentation-client.ts` (the recommended Next.js 15.3+ approach), with a reverse proxy set up in `next.config.ts` to route events through `/ingest` and minimize ad-blocker interference. A server-side PostHog client helper was created at `src/lib/posthog-server.ts`. Automatic exception capture (`capture_exceptions: true`) is enabled. Users are identified via `posthog.identify()` when their session loads in the Settings page. Fourteen product events covering the full user lifecycle — from sign-in through job discovery, outreach pipeline, billing, and settings — are now instrumented across 7 files.

| Event | Description | File |
|---|---|---|
| `sign_in_clicked` | User clicks the Google sign-in button | `src/app/app/(public)/signin/page.tsx` |
| `job_contact_revealed` | User unlocks a job contact's email via Reveal | `src/app/app/(protected)/jobs/page.tsx` |
| `job_draft_created` | User creates an AI-generated outreach email draft | `src/app/app/(protected)/jobs/page.tsx` |
| `job_ats_applied` | User marks a job as ATS applied | `src/app/app/(protected)/jobs/page.tsx` |
| `job_lead_saved` | User saves a recruiter lead from a job card | `src/app/app/(protected)/jobs/page.tsx` |
| `outreach_email_sent` | User sends an outreach email via the pipeline sheet | `src/app/app/(protected)/outreach/page.tsx` |
| `outreach_status_updated` | User advances an outreach record to a new status | `src/app/app/(protected)/outreach/page.tsx` |
| `outreach_draft_saved` | User saves a draft without sending | `src/app/app/(protected)/outreach/page.tsx` |
| `compose_email_sent` | User sends a manual email via the compose page | `src/app/app/(protected)/compose/page.tsx` |
| `billing_checkout_started` | User clicks upgrade to start Pro checkout | `src/app/app/(protected)/billing/page.tsx` |
| `billing_subscription_cancelled` | User cancels their Pro subscription | `src/app/app/(protected)/billing/page.tsx` |
| `source_added` | User adds a new job source (GitHub, Greenhouse, Lever) | `src/app/app/(protected)/sources/page.tsx` |
| `source_synced` | User manually triggers a source sync | `src/app/app/(protected)/sources/page.tsx` |
| `profile_saved` | User saves their profile settings | `src/app/app/(protected)/settings/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- 📊 **Dashboard — Analytics basics**: https://us.posthog.com/project/326576/dashboard/1317021
- 📈 **Sign-ins & Checkout starts over time**: https://us.posthog.com/project/326576/insights/z7fvHRzv
- 🔽 **User activation funnel** (Sign-in → Profile → Reveal → Email → Checkout): https://us.posthog.com/project/326576/insights/KRm5VZFg
- 📬 **Core outreach pipeline activity** (reveals, drafts, emails): https://us.posthog.com/project/326576/insights/mSaYfzQQ
- ⚠️ **Churn signal: subscription cancellations**: https://us.posthog.com/project/326576/insights/vI3hU5G4
- 🛠️ **User setup engagement** (sources added, synced, profile saves): https://us.posthog.com/project/326576/insights/UYnTZbPH

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
