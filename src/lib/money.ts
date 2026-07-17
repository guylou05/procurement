import { ZERO_DECIMAL_CURRENCIES } from "@/config/countries";

/**
 * Money is stored as integer minor units (e.g. cents). Zero-decimal currencies
 * (XAF, XOF, RWF, GNF, CDF) store whole units. Never use floats for money.
 */

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100;
}

/** Convert a human-entered major amount to integer minor units. */
export function toMinor(amount: number, currency: string): number {
  return Math.round(amount * minorUnitFactor(currency));
}

/** Convert stored minor units back to a major-unit number. */
export function toMajor(minor: number, currency: string): number {
  return minor / minorUnitFactor(currency);
}

/** Sum of invoice line items plus tax minus discount, in minor units. */
export function invoiceTotalMinor(
  items: { quantity: number; unitPriceMinor: number }[],
  taxMinor = 0,
  discountMinor = 0,
): number {
  const subtotal = items.reduce(
    (sum, i) => sum + Math.round(i.quantity * i.unitPriceMinor),
    0,
  );
  return subtotal + taxMinor - discountMinor;
}

/** Locale-aware currency formatting from stored minor units. */
export function formatMoney(minor: number, currency: string, locale = "en"): string {
  const value = toMajor(minor, currency);
  try {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    // Fallback for currencies Intl may not fully support with narrowSymbol.
    return `${value.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")} ${currency}`;
  }
}
