/**
 * Price display helpers for BRL (R$) and USD ($).
 * Use these for all user-facing price strings so both currencies are shown consistently.
 */

import { PRE_RELEASE } from "@/lib/config";

/** Default Pro monthly price in cents (BRL) when config is not available (e.g. client). */
export const DEFAULT_PRO_BRL_CENTS = 3900;
/** Default Pro monthly price in cents (USD) when config is not available. */
export const DEFAULT_PRO_USD_CENTS = 800;

export function formatBrl(cents: number): string {
  const value = cents / 100;
  return value % 1 === 0 ? `R$ ${value.toFixed(0)}` : `R$ ${value.toFixed(2)}`;
}

export function formatUsd(cents: number): string {
  const value = cents / 100;
  return value % 1 === 0 ? `$${value.toFixed(0)}` : `$${value.toFixed(2)}`;
}

/** e.g. "R$ 39 / $8" */
export function formatPriceDual(brlCents: number, usdCents: number): string {
  return `${formatBrl(brlCents)} / ${formatUsd(usdCents)}`;
}

/** Free tier display: "R$ 0 / $0" (use getFreePriceDisplay(locale) for single-currency). */
export const FREE_PRICE_DISPLAY = "R$ 0 / $0";

/** Pro monthly display using default cents (for client components). */
export const DEFAULT_PRO_PRICE_DISPLAY = formatPriceDual(DEFAULT_PRO_BRL_CENTS, DEFAULT_PRO_USD_CENTS);

/** Pro price to show in UI: R$ 0 / $0 during pre-release, otherwise R$ 39 / $8. */
export function getProPriceDisplay(): string {
  return PRE_RELEASE ? FREE_PRICE_DISPLAY : DEFAULT_PRO_PRICE_DISPLAY;
}

/** Locale type for price display (matches i18n Locale). */
export type PriceLocale = "pt-BR" | "en";

/** Free tier price for a single locale: "R$ 0" (pt-BR) or "$0" (en). */
export function getFreePriceDisplay(locale: PriceLocale): string {
  return locale === "pt-BR" ? "R$ 0" : "$0";
}

/** Pro price for a single locale: R$ 0 / $0 during pre-release, else "R$ 39" or "$8". */
export function getProPriceDisplayForLocale(locale: PriceLocale): string {
  if (PRE_RELEASE) return getFreePriceDisplay(locale);
  return locale === "pt-BR" ? formatBrl(DEFAULT_PRO_BRL_CENTS) : formatUsd(DEFAULT_PRO_USD_CENTS);
}
