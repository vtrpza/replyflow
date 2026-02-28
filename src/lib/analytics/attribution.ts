const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const STORAGE_KEY = "rf_first_touch";

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Reads UTM params from the current URL and persists to localStorage
 * on first touch only. Never overwrites existing stored attribution.
 */
export function persistFirstTouch(): void {
  if (!isBrowser()) return;

  try {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {};
    let hasAny = false;

    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) {
        attribution[key] = value;
        hasAny = true;
      }
    }

    if (hasAny) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
}

/**
 * Returns the persisted first-touch UTM attribution, or empty object if none.
 */
export function readFirstTouch(): Attribution {
  if (!isBrowser()) return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Attribution;
  } catch {
    return {};
  }
}
