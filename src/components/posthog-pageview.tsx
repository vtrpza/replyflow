"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Sends an explicit $pageview to PostHog on every client-side route change
 * within the app. Use inside the protected app shell so in-app navigations
 * are tracked (default PostHog only fires pageview on initial load).
 */
export function PostHogPageView(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && typeof window !== "undefined") {
      posthog.capture("$pageview", { path: pathname });
    }
  }, [pathname]);

  return null;
}
