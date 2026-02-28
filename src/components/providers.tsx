"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { analytics } from "@/lib/analytics";
import { BUILD_VERSION } from "@/lib/config";

function PostHogRegistrar({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { locale } = useI18n();
  const registered = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (registered.current) return;
    registered.current = true;

    analytics.register({
      build_version: BUILD_VERSION,
      is_logged_in: status === "authenticated",
      lang: locale,
    });
  }, [status, locale]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <PostHogRegistrar>{children}</PostHogRegistrar>
      </I18nProvider>
    </SessionProvider>
  );
}
