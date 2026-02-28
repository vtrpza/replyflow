"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import posthog from "posthog-js";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { analytics, persistFirstTouch, identifyUser } from "@/lib/analytics";
import { BUILD_VERSION } from "@/lib/config";

function PostHogRegistrar({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { locale } = useI18n();
  const registered = useRef(false);
  const identified = useRef(false);

  useEffect(() => {
    persistFirstTouch();
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    const utmSource = params.get("utm_source");
    const utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");
    const utmMedium = params.get("utm_medium");
    if (utmSource != null) utm.utm_source = utmSource;
    if (utmCampaign != null) utm.utm_campaign = utmCampaign;
    if (utmContent != null) utm.utm_content = utmContent;
    if (utmMedium != null) utm.utm_medium = utmMedium;
    if (Object.keys(utm).length > 0) {
      posthog.register_once(utm);
    }
    const ref = params.get("ref");
    if (ref != null) {
      posthog.register({ acquisition_ref: ref });
    }
  }, []);

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

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (identified.current) return;
    identified.current = true;

    const userId = session.user.id ?? session.user.email;
    if (userId) {
      identifyUser(userId, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
    }
  }, [status, session]);

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
