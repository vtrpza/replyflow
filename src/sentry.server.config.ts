import * as Sentry from "@sentry/nextjs";

const dsn: string | undefined = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && !Sentry.isInitialized()) {
  Sentry.init({
    dsn,
    sendDefaultPii: true,
  });
}
