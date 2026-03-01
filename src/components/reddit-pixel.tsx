"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const REDDIT_PIXEL_ID = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID;
/** Must match SIGNUP_CONVERSION_ID_ELEMENT_ID in app/(protected)/layout.tsx */
const SIGNUP_CID_ELEMENT_ID = "replyflow-signup-cid";

declare global {
  interface Window {
    rdt?: (method: string, ...args: unknown[]) => void;
  }
}

function generateConversionId(prefix = "ev"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Send the same conversion to Reddit Conversions API (server-side) for deduplication with the pixel.
 */
function sendRedditCapi(eventName: string, conversionId: string): void {
  fetch("/api/telemetry/reddit-conversion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, conversionId }),
  }).catch(() => {});
}

/**
 * Track a Reddit conversion event with a unique conversionId (for dedup with CAPI).
 * Use for events you set up in the Event Setup Tool (e.g. SignUp, Purchase).
 * Also sends the event to the Conversions API with the same conversionId.
 */
export function trackRedditConversion(
  eventName: string,
  conversionId?: string,
): void {
  if (typeof window === "undefined" || !window.rdt || !REDDIT_PIXEL_ID) return;
  const id = conversionId ?? generateConversionId(eventName.toLowerCase());
  window.rdt("track", eventName, { conversionId: id });
  sendRedditCapi(eventName, id);
}

/**
 * Injects the Reddit Pixel loader script and initializes with optional
 * advanced matching (email, externalId) when the user is logged in.
 * Tracks PageVisit on each page. Only runs when NEXT_PUBLIC_REDDIT_PIXEL_ID is set.
 */
export function RedditPixel(): null {
  const { data: session, status } = useSession();
  const loaderInjected = useRef(false);
  const initAndTrackDone = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !REDDIT_PIXEL_ID) return;
    if (loaderInjected.current) return;

    // Reddit snippet: define rdt queue and load pixel script
    if (!window.rdt) {
      type RdtQueue = { callQueue: unknown[]; sendEvent?: (...a: unknown[]) => void };
      const p = (window.rdt = function (...args: unknown[]) {
        const self = p as unknown as RdtQueue;
        if (typeof self.sendEvent === "function") {
          self.sendEvent.apply(p, args);
        } else {
          self.callQueue.push(args);
        }
      }) as unknown as RdtQueue;
      p.callQueue = [];
      const t = document.createElement("script");
      t.src = `https://www.redditstatic.com/ads/pixel.js?pixel_id=${REDDIT_PIXEL_ID}`;
      t.async = true;
      const s = document.getElementsByTagName("script")[0];
      s?.parentNode?.insertBefore(t, s);
    }

    loaderInjected.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.rdt || !REDDIT_PIXEL_ID) return;
    if (initAndTrackDone.current) return;
    // Wait for session to resolve so we can pass match keys when logged in
    if (status === "loading") return;

    initAndTrackDone.current = true;
    const matchKeys: Record<string, string> = {};
    if (status === "authenticated" && session?.user) {
      if (session.user.email) matchKeys.email = session.user.email;
      if (session.user.id) matchKeys.externalId = session.user.id;
    }

    if (Object.keys(matchKeys).length > 0) {
      window.rdt("init", REDDIT_PIXEL_ID, matchKeys);
    } else {
      window.rdt("init", REDDIT_PIXEL_ID);
    }
    window.rdt("track", "PageVisit", {
      conversionId: generateConversionId("pagevisit"),
    });

    // If layout rendered new-signup marker (first session after signup), fire Reddit SignUp with same conversionId and remove marker
    const signupEl = typeof document !== "undefined" ? document.getElementById(SIGNUP_CID_ELEMENT_ID) : null;
    const signupConversionId = signupEl?.getAttribute("data-conversion-id")?.trim();
    if (signupConversionId) {
      trackRedditConversion("SignUp", signupConversionId);
      signupEl?.remove();
    }
  }, [status, session?.user]);

  return null;
}
