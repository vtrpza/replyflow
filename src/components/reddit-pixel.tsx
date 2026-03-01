"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const REDDIT_PIXEL_ID = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID;

declare global {
  interface Window {
    rdt?: (method: string, ...args: unknown[]) => void;
  }
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
      const p = (window.rdt = function (...args: unknown[]) {
        if (typeof (p as { sendEvent?: (...a: unknown[]) => void }).sendEvent === "function") {
          (p as { sendEvent: (...a: unknown[]) => void }).sendEvent.apply(p, args);
        } else {
          (p as { callQueue: unknown[] }).callQueue.push(args);
        }
      }) as { callQueue: unknown[]; sendEvent?: (...a: unknown[]) => void };
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
    window.rdt("track", "PageVisit");
  }, [status, session?.user?.email, session?.user?.id]);

  return null;
}
