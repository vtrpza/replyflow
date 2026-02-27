# Sentry

Error tracking and performance monitoring for the application.

## Setup

- **DSN (server/edge)**: `SENTRY_DSN`
- **DSN (client/browser)**: `NEXT_PUBLIC_SENTRY_DSN` (same value)
- **Project**: gitjobs-v2 (ReplyFlow)
- **SDK**: `@sentry/nextjs`

## Configuration

Sentry is initialized in Next.js instrumentation hooks and dedicated runtime config files:

- `src/instrumentation.ts`
  - `register()` loads runtime config for `nodejs` and `edge`
  - `onRequestError` forwards request errors to Sentry (`captureRequestError`)
- `src/sentry.server.config.ts`
  - server-side init
- `src/sentry.edge.config.ts`
  - edge runtime init
- `src/instrumentation-client.ts`
  - browser init and navigation hook (`onRouterTransitionStart`)
- `src/app/global-error.tsx`
  - captures App Router render errors on client with `captureException`

```typescript
// src/instrumentation.ts
import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = (...args: Parameters<typeof Sentry.captureRequestError>): void => {
  Sentry.captureRequestError(...args);
};
```

## Notes

- `sendDefaultPii: true` is enabled - IP addresses and other PII may be collected
- Client-side errors are now captured via `instrumentation-client.ts` and `global-error.tsx`
