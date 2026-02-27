# Sentry

Error tracking and performance monitoring for the application.

## Setup

- **DSN**: `https://ed7a2fa3cb4e75e871223fc4265fa971@o4510956029214720.ingest.us.sentry.io/4510956029476864`
- **Project**: gitjobs-v2 (ReplyFlow)
- **SDK**: `@sentry/node`

## Configuration

The Sentry SDK is initialized in `src/instrument.ts`, imported at the top of `src/app/layout.tsx` to capture errors as early as possible in the application lifecycle.

```typescript
// src/instrument.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://ed7a2fa3cb4e75e871223fc4265fa971@o4510956029214720.ingest.us.sentry.io/4510956029476864",
  sendDefaultPii: true,
});
```

## Notes

- `sendDefaultPii: true` is enabled - IP addresses and other PII may be collected
- Currently using the Node SDK (server-side only)
- For client-side error capturing, consider adding `@sentry/nextjs` package
