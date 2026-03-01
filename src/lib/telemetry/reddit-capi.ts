/**
 * Reddit Conversions API (CAPI) – server-side conversion events for deduplication with the pixel.
 * See: Reddit Ads Manager → Pixel → Set up events → Server access.
 */

const REDDIT_CAPI_URL = "https://ads-api.reddit.com/api/v3/pixels";
const ACTION_SOURCE = "website";

const STANDARD_EVENTS = new Set<string>(["SignUp", "Purchase", "Lead", "ViewContent", "AddToCart"]);

export interface RedditConversionUser {
  email?: string;
  external_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface RedditConversionMetadata {
  conversion_id: string;
  value?: number;
  currency?: string;
}

export interface RedditConversionEventParams {
  eventName: string;
  conversionId: string;
  user?: RedditConversionUser;
  metadata?: Partial<RedditConversionMetadata>;
}

/**
 * Send a single conversion event to Reddit Conversions API.
 * Uses REDDIT_ADS_API_TOKEN (Bearer) and NEXT_PUBLIC_REDDIT_PIXEL_ID.
 * event_at must be within the last 7 days (we use current time).
 */
export async function sendRedditConversionEvent(
  params: RedditConversionEventParams,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const token = process.env.REDDIT_ADS_API_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID;

  if (!token || !pixelId) {
    return { ok: false, status: 0, error: "Reddit CAPI not configured" };
  }

  const eventAt = Date.now();
  const isStandard = STANDARD_EVENTS.has(params.eventName);
  const eventPayload: Record<string, unknown> = {
    event_at: eventAt,
    action_source: ACTION_SOURCE,
    type: isStandard
      ? { tracking_type: params.eventName }
      : { tracking_type: "CUSTOM", custom_event_name: params.eventName },
    metadata: {
      conversion_id: params.conversionId,
      ...(params.metadata?.value != null && { value: params.metadata.value }),
      ...(params.metadata?.currency && { currency: params.metadata.currency }),
    },
  };

  if (params.user && Object.keys(params.user).length > 0) {
    eventPayload.user = params.user;
  }

  const body = { data: { events: [eventPayload] } };

  try {
    const res = await fetch(`${REDDIT_CAPI_URL}/${pixelId}/conversion_events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Reddit CAPI error:", res.status, text);
      return { ok: false, status: res.status, error: text };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error("Reddit CAPI request failed:", err);
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
