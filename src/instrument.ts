import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://ed7a2fa3cb4e75e871223fc4265fa971@o4510956029214720.ingest.us.sentry.io/4510956029476864",
  sendDefaultPii: true,
});
