# Analytics Audit Report

## Executive summary

**Diagnosis:** Reddit Ads sees conversions (Page Visit, Custom: SignUp) because the Reddit pixel is in the root layout and fires on every page load, and SignUp is sent both server-side (CAPI) and client-side (pixel with dedup). PostHog is initialized globally and has server-side `signup_completed`, but **client-side conversion events are missing or fire in the wrong place**, and **server-side PostHog events may be dropped** because `shutdown()` is not awaited. PostHog also has no explicit `signup_completed` (or equivalent) from the client, and the only login event (`user_logged_in`) fires only when the user is *on the signin page* when session appears—so it **does not fire** in the typical OAuth flow (redirect to `/app`).

**Most likely root causes (ranked):**

1. **`user_logged_in` never fires for the main flow** — After Google OAuth, NextAuth redirects to `callbackUrl: "/app"`, so the user lands on `/app`, not `/app/signin`. The signin page’s `useEffect` that captures `user_logged_in` only runs when session becomes truthy *while on the signin page*. So for the primary conversion path, PostHog gets no client-side “login/signup” event.
2. **No client-side `signup_completed`** — Reddit fires SignUp (pixel + CAPI). PostHog has server-side `signup_completed` in `ensureUserExists()` but no client-side equivalent. If server events are lost (see #3), PostHog has no conversion event.
3. **Server-side PostHog events may be dropped** — In `src/lib/plan/index.ts`, `void phClient.shutdown()` is used without awaiting. The posthog-node client flushes asynchronously; the request can finish before the event is sent, so `signup_completed` and `pipeline_created` may never reach PostHog.
4. **No explicit SPA pageview tracking** — PostHog’s default `$pageview` fires on initial load only. Client-side navigations (e.g. landing → signin → app) may not produce a second `$pageview` for `/app`, depending on whether the OAuth redirect is a full page load (it is). So first load of `/app` should send one `$pageview`, but route changes inside the app are not explicitly tracked.
5. **Environment / config** — If `NEXT_PUBLIC_POSTHOG_KEY` is missing or wrong in production, client init no-ops or fails; server would still send if key is set. No `.env.example` entry for PostHog key or debug flag.

**Confidence:** **High** for #1 and #2 (confirmed in code); **medium** for #3 (common posthog-node pitfall); **medium** for #4–#5.

---

## Tracking inventory

| Location | Function / component | What it tracks | Status |
|----------|----------------------|----------------|--------|
| **Reddit Pixel** | | | |
| `src/app/layout.tsx` | Renders `<RedditPixel />` | N/A (mount point) | Correct — root layout, all routes |
| `src/components/reddit-pixel.tsx` | `RedditPixel` | Injects pixel script; on mount (after session ready) calls `rdt("track", "PageVisit", { conversionId })`; if element `#replyflow-signup-cid` exists, fires `trackRedditConversion("SignUp", signupConversionId)` | **Partial** — PageVisit fires once per load; SignUp only when protected layout rendered marker (new signup). Correct. |
| `src/components/reddit-pixel.tsx` | `trackRedditConversion(eventName, conversionId?)` | `rdt("track", eventName, { conversionId })` + POST to `/api/telemetry/reddit-conversion` for CAPI dedup | Correct |
| `src/app/api/telemetry/reddit-conversion/route.ts` | POST handler | Forwards eventName + conversionId to Reddit CAPI | Correct |
| `src/app/app/(protected)/layout.tsx` | Server layout | If `wasCreated` (new user), generates conversionId, calls `sendRedditConversionEvent({ eventName: "SignUp", conversionId, user })`, renders hidden `<div id="replyflow-signup-cid" data-conversion-id={...}>` for pixel | Correct — CAPI + client dedup |
| `src/lib/telemetry/reddit-capi.ts` | `sendRedditConversionEvent` | Server-side POST to Reddit CAPI | Correct |
| **PostHog** | | | |
| `src/instrumentation-client.ts` | Top-level `posthog.init(...)` | Client init with `api_host: "/ingest"`, `capture_exceptions`, `debug` in dev | **Correct** — runs on client app load (all pages). No `capture_pageview: false`, so default pageview on load. |
| `next.config.ts` | `rewrites` | `/ingest/static/:path*` → PostHog static; `/ingest/:path*` → PostHog API | Correct — reduces adblock issues |
| `src/lib/posthog-server.ts` | `getPostHogClient()` | New PostHog Node client per call; `flushAt: 1`, `flushInterval: 0` | **Risk** — each call creates new client; callers use `void phClient.shutdown()` (see plan/index.ts) so flush may not complete |
| `src/components/providers.tsx` | `PostHogRegistrar` | `persistFirstTouch()`; UTM + ref via `posthog.register_once`/`register`; `analytics.register({ build_version, is_logged_in, lang })`; when `status === "authenticated"`, `identifyUser(session.user.id ?? session.user.email, { email, name })` | **Correct** — identify runs when session is authenticated. Runs inside root layout so all routes covered. |
| `src/lib/analytics/index.ts` | `identifyUser(id, properties?)` | `posthog.identify(id, properties)`; sets first-touch UTM as `$set_once` and captures `$set` | Correct |
| `src/lib/analytics/index.ts` | `captureEvent(event, properties?)` | Merges first-touch attribution and `posthog.capture(event, merged)` | Correct |
| `src/lib/analytics/index.ts` | `analytics.ctaClicked`, `replyCreated`, `replyCopied`, `register` | Wrappers for `captureEvent` / `posthog.register` | Correct |
| `src/lib/plan/index.ts` | `ensureUserExists` (when `wasCreated`) | `getPostHogClient().capture({ distinctId, event: "signup_completed", properties })` then `void phClient.shutdown()` | **Partial / broken** — event sent server-side; `shutdown()` not awaited, so event may be dropped |
| `src/lib/plan/index.ts` | After `runSourceDiscovery` for new user | `getPostHogClient().capture({ distinctId, event: "pipeline_created", ... })` then `void phClient.shutdown()` | Same risk as above |
| `src/app/api/sync/route.ts` | After sync | `getPostHogClient().capture({ distinctId, event: "sync_completed", ... })` | Same pattern; shutdown/flush not verified |
| `src/app/api/outreach/route.ts` | After send | `getPostHogClient().capture({ distinctId, event: "outreach_email_sent", ... })` | Same |
| `src/app/api/jobs/route.ts` | After reply create | `getPostHogClient().capture({ distinctId, event: "reply_created", ... })` | Same |
| **Auth / signup flow** | | | |
| `src/app/app/(public)/signin/page.tsx` | `useEffect` when `session` truthy | `captureEvent("user_logged_in", { provider: "google" })` then `router.push("/app")` | **Broken for main flow** — only runs when user is *on* `/app/signin` with session. OAuth redirect goes to `/app`, so this often never runs. |
| `src/app/app/(public)/signin/page.tsx` | Button onClick | `captureEvent("sign_in_clicked", { provider: "google" })` then `signIn("google", { callbackUrl: "/app" })` | Correct |
| **Other client captureEvent usages** | | | |
| Marketing `src/app/(marketing)/page.tsx` | CTA clicks | `analytics.ctaClicked({ location: "nav" | "hero" | "pricing" | "footer_cta" })` | Correct |
| `src/components/onboarding/OnboardingProvider.tsx` | Onboarding actions | `onboarding_started`, `onboarding_step_completed`, `onboarding_completed`, `onboarding_skipped` | Correct |
| Protected pages (sources, jobs, settings, billing, compose, outreach) | Various actions | `source_synced`, `source_added`, `job_draft_created`, `job_added`, `job_contact_revealed`, `job_lead_saved`, `job_ats_applied`, `gmail_connected`, `profile_saved`, `billing_checkout_started`, `billing_subscription_cancelled`, `compose_email_sent`, `card_moved`, `followup_scheduled`, `reply_copied`, `template_used`, `outreach_draft_saved`, `outreach_email_sent` | Correct where used |
| **Environment** | | | |
| `.env.example` | — | `NEXT_PUBLIC_REDDIT_PIXEL_ID`, `REDDIT_ADS_API_TOKEN` | No `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, or `NEXT_PUBLIC_ANALYTICS_DEBUG` |
| `src/lib/analytics/index.ts` | DEBUG | `NEXT_PUBLIC_ANALYTICS_DEBUG === "true"` for console logs | Document in .env.example if desired |

---

## Flow mapping

| Step | Expected Reddit event | Expected PostHog event | Exists in code? | Explicit vs autocapture | Confidence |
|------|------------------------|------------------------|------------------|--------------------------|------------|
| Landing page visit | PageVisit (when pixel loads) | $pageview (default on load) | Reddit: yes. PostHog: default pageview on load | Reddit explicit; PostHog implicit | High |
| CTA click (e.g. hero “Start free”) | — | cta_clicked | Yes (marketing page) | Explicit | High |
| Sign-in page visit | PageVisit (if full load) or none (if client nav) | $pageview if full load | Reddit: yes on load. PostHog: only if full load | Implicit | Medium |
| “Continue with Google” click | — | sign_in_clicked | Yes | Explicit | High |
| Signup success (new user) | SignUp (CAPI from layout + pixel from marker) | signup_completed (server) + identify (client) | Reddit: yes. PostHog: server event exists but may not flush; no client signup_completed | Reddit explicit; PostHog server explicit, client missing | High (gap) |
| Login success (returning user) | PageVisit on /app | user_logged_in + identify | user_logged_in only when session appears on *signin page*; OAuth redirect goes to /app so often no user_logged_in | Explicit but wrong place | High (gap) |
| Redirect into /app | — | $pageview for /app (full redirect = new load) | PostHog default pageview on /app load | Implicit | Medium |
| Dashboard fully loaded | — | — | No dashboard_loaded event | Missing | High |
| First meaningful product action | — | Various (source_added, job_added, etc.) | Yes for many actions | Explicit | High |

---

## Gaps found

1. **No client-side `signup_completed`** — Reddit has SignUp (pixel + CAPI). PostHog only has server-side `signup_completed`; if server flush fails or is not awaited, there is no conversion event in PostHog. Client should fire `signup_completed` when the signup marker is present (same condition Reddit pixel uses).
2. **`user_logged_in` does not fire for the main OAuth flow** — It only runs in the signin page’s `useEffect` when session becomes truthy. After Google OAuth, NextAuth redirects to `/app`, so the user never lands back on the signin page with session. So PostHog gets no “login” event for the primary path.
3. **Server-side PostHog `shutdown()` not awaited** — In `ensureUserExists` and pipeline_created (and other server captures), `void phClient.shutdown()` is used. The Node SDK flushes on shutdown; if the request ends before flush completes, events can be lost.
4. **No explicit `dashboard_loaded` (or equivalent)** — The dashboard page does not capture when the dashboard is ready; only autocapture/pageview. Hard to align “conversion” with “saw dashboard” in PostHog.
5. **No explicit SPA route change tracking** — PostHog’s default is one `$pageview` per initial load. In-app navigations (e.g. /app → /app/jobs) are not explicitly sent as pageviews. Reddit only fires PageVisit once per load in RedditPixel effect.
6. **Semantic mismatch: Reddit “SignUp” vs PostHog “user_logged_in”** — Reddit SignUp = new user only. PostHog user_logged_in = any login (and often not fired). So conversion counts are not comparable without a dedicated PostHog signup event.
7. **PostHog env vars not in .env.example** — `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_ANALYTICS_DEBUG` are undocumented; misconfiguration could cause silent no-op.

---

## Runtime validation checklist

### 1. PostHog client init and key

- **Page:** Any (e.g. open `https://your-domain/`).
- **Action:** Open DevTools → Console.
- **Check:** Run `window.posthog.__loaded` (or check for `posthog` on window if exposed). If init ran, it should be true.
- **Check:** Run `window.posthog.config.api_host` → should be `"/ingest"`.
- **Failure:** If `posthog` is undefined or not loaded, init failed (e.g. missing `NEXT_PUBLIC_POSTHOG_KEY` or script error).

### 2. Network: PostHog requests

- **Page:** Any.
- **Action:** DevTools → Network, filter by “ingest” or “posthog”.
- **Check:** After load, expect requests to `/ingest/` (batch or capture). Status 200.
- **Failure:** No requests → init failed or key missing. 4xx/5xx → config or PostHog project issue.

### 3. Reddit pixel

- **Page:** Any (with `NEXT_PUBLIC_REDDIT_PIXEL_ID` set).
- **Action:** Network tab, filter “redditstatic” or “pixel”.
- **Check:** Script `https://www.redditstatic.com/ads/pixel.js?pixel_id=...` loaded. Then (e.g. in Console) `window.rdt` should be a function.
- **Failure:** Script blocked (adblock) or pixel ID missing.

### 4. Landing → CTA → Sign-in

- **Page:** Landing `/`.
- **Action:** Click “Get started” / “Start free” (hero or nav). Should navigate to `/app` then redirect to `/app/signin`.
- **Check:** Before navigation, PostHog should send `cta_clicked` (Network → ingest request payload, or PostHog debug in console if `NEXT_PUBLIC_ANALYTICS_DEBUG=true`).
- **Check:** Reddit: PageVisit should have fired on landing load.
- **Failure:** No `cta_clicked` → handler not bound or PostHog not capturing.

### 5. Sign-in click

- **Page:** `/app/signin`.
- **Action:** Click “Continue with Google”.
- **Check:** PostHog should send `sign_in_clicked` before redirect to Google.
- **Failure:** Same as above.

### 6. Post-OAuth: redirect to /app (new user)

- **Flow:** Complete Google sign-in (new user so protected layout creates user and signup marker).
- **Page:** After redirect, you land on `/app` (full page load).
- **Check (Reddit):** In Network, Reddit pixel may fire (or already loaded). In Reddit Ads Manager (or pixel helper), expect SignUp with conversionId.
- **Check (PostHog):**  
  - One `$pageview` for `/app`.  
  - Shortly after, an `identify` call (or person set) with user id.  
  - **No** `user_logged_in` in this path (you didn’t load signin page with session).  
  - In PostHog project, check for server event `signup_completed` with distinct_id = user id (may be missing if server flush not awaited).
- **Failure:** No identify → SessionProvider/PostHogRegistrar not running or session not ready. No signup_completed → server event not sent or not flushed.

### 7. Post-OAuth: redirect to /app (returning user)

- **Flow:** Sign in with existing user; redirect to `/app`.
- **Check (PostHog):** `$pageview` for `/app`, then `identify`. No signup marker, so no Reddit SignUp. `user_logged_in` again not fired (same redirect-to-/app flow).
- **Failure:** Same as above for identify.

### 8. Dashboard loaded

- **Page:** `/app` (dashboard).
- **Action:** Wait until stats load and UI is visible.
- **Check:** No explicit `dashboard_loaded` event in code; only autocapture / default pageview. So no event to validate; confirms gap.

### 9. SPA navigation

- **Page:** `/app`. Then click sidebar to `/app/jobs` (client-side nav).
- **Check:** No new request to `/ingest` with a pageview for `/app/jobs` unless you added explicit route tracking. Default PostHog behavior is single pageview per load.
- **Failure:** N/A; confirms SPA pageviews not implemented.

### 10. Console debug (optional)

- **Set:** `NEXT_PUBLIC_ANALYTICS_DEBUG=true` and reload.
- **Check:** Console shows `[analytics:capture]`, `[analytics:identify]` for events.
- **Use:** To confirm client-side capture/identify calls at the right time.

---

## Recommended event schema

### Priority 1 (must-have, business critical)

| Event | When to fire | Where | Key properties |
|-------|----------------|-------|-----------------|
| `landing_page_viewed` | First paint of marketing landing (optional; can rely on $pageview + path) | Marketing layout or landing page | `path`, `utm_*` (from first-touch) |
| `cta_clicked` | User clicks primary CTA (Start free, Get started, etc.) | Already: marketing page | `location` (nav, hero, pricing, footer_cta) |
| `signup_started` | User clicks “Continue with Google” (optional; you have sign_in_clicked) | signin page | `provider: "google"` |
| `signup_completed` | New user: first time they hit protected app (same moment as Reddit SignUp) | Client: when signup marker present (RedditPixel logic). Server: keep but fix flush. | `provider`, `conversion_id` (optional, for Reddit parity) |
| `login_completed` | Any user lands on /app with session (returning or just signed up) | Client: in PostHogRegistrar or a small “app landed” component when status === "authenticated" and path is /app (or first protected load) | `is_new_user` (if known from marker or server hint) |
| `dashboard_loaded` | Dashboard stats fetch succeeded and UI ready | Dashboard page after setStats and not loading | `has_sources`, `jobs_count` (optional) |
| `first_job_synced` / `first_sync_completed` | First successful sync that brings job count > 0 | Sync API or dashboard after first sync | — |
| `draft_created` | User creates a job draft | Already: `job_draft_created` | — |

### Priority 2 (activation / engagement)

| Event | When | Where | Key properties |
|-------|------|-------|-----------------|
| `source_added` | Already | sources page | `source_type` |
| `source_synced` | Already | sources page | `source_id`, `source_type` |
| `job_added` | Already | jobs page | `job_id`, `method` |
| `onboarding_completed` | Already | OnboardingProvider | `duration_seconds` |
| `outreach_email_sent` | Already | compose / outreach | — |
| `reply_created` | Already | jobs / outreach | — |

### Priority 3 (nice-to-have / diagnostic)

| Event | When | Where | Key properties |
|-------|------|-------|-----------------|
| `$pageview` (explicit on route change) | Every client-side route change in app | Layout or provider with usePathname | `path`, `referrer` |
| `gmail_connected` | Already | settings | — |
| `billing_checkout_started` | Already | billing | — |

---

## Minimal implementation plan

1. **Fix server-side PostHog flush**  
   In `src/lib/plan/index.ts` (and any other place that uses `getPostHogClient().capture` + `shutdown()`): await `phClient.shutdown()` before the request completes (or use a shared client and flush at end of request). Ensure `signup_completed` and `pipeline_created` are sent reliably.

2. **Fire client-side `signup_completed` when marker exists**  
   In `RedditPixel` (or a small shared effect), when you find the element `#replyflow-signup-cid` and fire Reddit SignUp, also call `captureEvent("signup_completed", { provider: "google" })` (and optional `conversion_id` from the same element). So PostHog has a client conversion event even if server event is lost.

3. **Fire a single “app landed / login” event from the client**  
   When `status === "authenticated"` and the app has just loaded a protected route (e.g. first time in this session), capture one of: `login_completed` or `app_loaded` with property `is_new_user: true` when the signup marker was present, else `false`. This gives PostHog a conversion signal for both new and returning users and aligns with “entered app” (no dependency on signin page).

4. **Add `dashboard_loaded`**  
   In the dashboard page, after stats are set and loading is false, call `captureEvent("dashboard_loaded", { jobs_count, has_sources: totalReposMonitored > 0 })` once per mount.

5. **Optional: explicit pageview on SPA navigation**  
   In the app shell (e.g. protected layout client wrapper or a provider), use `usePathname()` and `useEffect` to call `posthog.capture("$pageview", { path: pathname })` on pathname change. Ensures every in-app route is visible in PostHog.

6. **Document and validate env**  
   Add to `.env.example`: `NEXT_PUBLIC_POSTHOG_KEY=`, `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`, `NEXT_PUBLIC_ANALYTICS_DEBUG=false`. In deployment, confirm key is set and run the runtime checklist above.

---

## Code suggestions

### 1. PostHog provider / init (already in place; ensure key and proxy)

Init stays in `instrumentation-client.ts`. Ensure `NEXT_PUBLIC_POSTHOG_KEY` is set. Proxy is already `/ingest` in next.config.

```ts
// instrumentation-client.ts — no change; ensure env is set
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  capture_pageview: true, // default; explicit if you want
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
});
```

### 2. Client-side `signup_completed` when marker exists (in RedditPixel)

In `src/components/reddit-pixel.tsx`, where you already do:

```ts
if (signupConversionId) {
  trackRedditConversion("SignUp", signupConversionId);
  signupEl?.remove();
}
```

Add:

```ts
import { captureEvent } from "@/lib/analytics";

// inside the same block:
if (signupConversionId) {
  trackRedditConversion("SignUp", signupConversionId);
  captureEvent("signup_completed", { provider: "google", conversion_id: signupConversionId });
  signupEl?.remove();
}
```

### 3. Explicit “app landed” / login_completed (in PostHogRegistrar or new hook)

In `src/components/providers.tsx`, in the same `useEffect` that calls `identifyUser`, after identifying, fire a one-time “app landed” event so PostHog has a conversion for every login (and you can set `is_new_user` if you read the marker before it’s removed):

```ts
// After identifyUser(...) in the authenticated effect:
const signupEl = typeof document !== "undefined" ? document.getElementById("replyflow-signup-cid") : null;
captureEvent("login_completed", {
  provider: "google",
  is_new_user: !!signupEl,
});
```

Use a ref to fire only once per session if needed (e.g. `loginCompletedSent.current = true`).

### 4. Explicit pageview on SPA navigation (app only)

Create a small client component used in the protected layout:

```ts
// src/components/posthog-pageview.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogPageView() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname && typeof window !== "undefined") {
      posthog.capture("$pageview", { path: pathname });
    }
  }, [pathname]);
  return null;
}
```

Render `<PostHogPageView />` inside the protected layout (e.g. next to OnboardingProvider). Then every in-app route change sends a pageview.

### 5. Dashboard loaded

In `src/app/app/(protected)/page.tsx`, after the stats `useEffect` that does `setStats(...)` and `setLoading(false)`, add a one-time capture when we have stats and are not loading:

```ts
// After the fetch that sets stats and sets loading(false):
useEffect(() => {
  if (loading || !stats) return;
  captureEvent("dashboard_loaded", {
    jobs_count: stats.totalJobs,
    has_sources: stats.totalReposMonitored > 0,
  });
}, [loading, stats]);
```

Use a ref so it fires only once per mount if you want a single event per visit.

### 6. Server-side: await flush before request ends

In `src/lib/plan/index.ts`, replace:

```ts
const phClient = getPostHogClient();
phClient.capture({ ... });
void phClient.shutdown();
```

with:

```ts
const phClient = getPostHogClient();
phClient.capture({ ... });
await phClient.shutdown(); // caller must be in async context
```

Ensure the caller of `ensureUserExists` (the protected layout) is async and awaits any helper that performs the capture + shutdown, or use a small wrapper that awaits shutdown so the response is not sent before the event is flushed.

---

## Final verdict

| Question | Answer |
|----------|--------|
| **Can Reddit Ads be trusted right now?** | **Yes.** PageVisit and SignUp are implemented correctly (pixel + CAPI, same conversionId). Pixel is in root layout and fires on every load; SignUp is sent server-side and client-side with dedup. |
| **Can PostHog be trusted right now?** | **No, not for conversion parity.** Client-side conversion events are missing or fire in the wrong place (`user_logged_in` not in the main flow; no client `signup_completed`). Server-side `signup_completed` may be dropped due to unawaited `shutdown()`. So Reddit can show more conversions than PostHog. |
| **What needs to be fixed first?** | (1) Fire client-side `signup_completed` when the signup marker is present (same place as Reddit SignUp). (2) Fix server-side PostHog flush (await `shutdown()` or equivalent). (3) Fire a single `login_completed` (or `app_loaded`) when the user lands on the app authenticated, so PostHog has a conversion for every login. (4) Add `dashboard_loaded` for activation. (5) Optionally add SPA pageview tracking and document PostHog env vars. |

**Root cause ranking (most → least likely):**

1. `user_logged_in` never runs in the main OAuth flow (redirect to `/app`).
2. No client-side `signup_completed`; server event may be lost (shutdown not awaited).
3. Semantic mismatch (Reddit SignUp vs PostHog identify-only / lost server event).
4. No explicit dashboard or “app landed” event for product analytics.
5. Env/config (key missing or wrong) causing silent client no-op.
