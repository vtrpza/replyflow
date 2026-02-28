import posthog from "posthog-js";
import { readFirstTouch } from "./attribution";

export { persistFirstTouch, readFirstTouch } from "./attribution";
export type { Attribution } from "./attribution";

// ─── Debug ──────────────────────────────────────────────────

const DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";

function debugLog(label: string, data: unknown): void {
  if (DEBUG && typeof window !== "undefined") {
    console.log(`[analytics:${label}]`, data);
  }
}

// ─── Core helpers ───────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Identify the authenticated user in PostHog.
 * Also sets first-touch UTM as $set_once person properties.
 */
export function identifyUser(
  id: string,
  properties?: Record<string, unknown>,
): void {
  if (!isBrowser()) return;

  const attribution = readFirstTouch();
  const setOnce: Record<string, unknown> = {};
  if (attribution.utm_source) setOnce.initial_utm_source = attribution.utm_source;
  if (attribution.utm_medium) setOnce.initial_utm_medium = attribution.utm_medium;
  if (attribution.utm_campaign) setOnce.initial_utm_campaign = attribution.utm_campaign;
  if (attribution.utm_content) setOnce.initial_utm_content = attribution.utm_content;

  debugLog("identify", { id, ...properties, $set_once: setOnce });

  posthog.identify(id, properties);
  if (Object.keys(setOnce).length > 0) {
    posthog.setPersonPropertiesForFlags(setOnce);
    posthog.capture("$set", { $set_once: setOnce });
  }
}

/**
 * Capture a custom event with first-touch UTM automatically attached.
 */
export function captureEvent(
  event: string,
  properties?: Record<string, unknown> | object,
): void {
  if (!isBrowser()) return;

  const attribution = readFirstTouch();
  const merged = { ...attribution, ...properties };

  debugLog("capture", { event, ...merged });
  posthog.capture(event, merged);
}

// ─── Legacy analytics object (backward-compatible) ──────────

export type InputLengthBucket = "xs" | "sm" | "md" | "lg";

interface ReplyCreatedProps {
  is_first_reply: boolean;
  reply_type: string;
  input_length_bucket: InputLengthBucket;
}

interface ReplyCopiedProps {
  reply_type: string;
}

interface CtaClickedProps {
  location: string;
}

export function computeInputLengthBucket(charCount: number): InputLengthBucket {
  if (charCount < 200) return "xs";
  if (charCount < 500) return "sm";
  if (charCount < 2000) return "md";
  return "lg";
}

export const analytics = {
  replyCreated(props: ReplyCreatedProps): void {
    captureEvent("reply_created", props);
  },

  replyCopied(props: ReplyCopiedProps): void {
    captureEvent("reply_copied", props);
  },

  ctaClicked(props: CtaClickedProps): void {
    captureEvent("cta_clicked", props);
  },

  register(props: Record<string, unknown>): void {
    if (!isBrowser()) return;
    posthog.register(props);
  },
};
