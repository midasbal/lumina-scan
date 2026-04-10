// ---------------------------------------------------------------------------
// Feature 5 — Dynamic Pricing based on code complexity
// ---------------------------------------------------------------------------
// Shared between frontend (page.tsx) and backend (api/scan/route.ts).
// ---------------------------------------------------------------------------

/** Base fee charged for every scan, regardless of size. */
export const BASE_FEE_USDC = 0.1;

/** Additional fee per character of source code. */
export const PER_CHAR_USDC = 0.005;

/** Minimum total price floor (never charge less than base). */
export const MIN_PRICE_USDC = BASE_FEE_USDC;

/** Maximum price cap to keep things reasonable. */
export const MAX_PRICE_USDC = 50;

/** Feature 9 — Priority Queue surcharge for VIP lane processing. */
export const PRIORITY_SURCHARGE = 0.5;

/**
 * Calculate the audit price in USDC for a given source code string.
 *
 * Formula:  price = BASE_FEE + (characterCount × PER_CHAR) [+ PRIORITY_SURCHARGE]
 * Clamped to [MIN_PRICE, MAX_PRICE] (before surcharge).
 *
 * @param code - The raw source code to price.
 * @param isPriority - Whether the VIP priority lane is active.
 * @returns The price in USDC.
 */
export function calculatePrice(code: string, isPriority: boolean = false): number {
  if (!code || code.trim().length === 0) {
    return isPriority ? MIN_PRICE_USDC + PRIORITY_SURCHARGE : MIN_PRICE_USDC;
  }

  const charCount = code.length;
  const raw = BASE_FEE_USDC + charCount * PER_CHAR_USDC;
  const base = Math.min(MAX_PRICE_USDC, Math.max(MIN_PRICE_USDC, parseFloat(raw.toFixed(4))));
  return isPriority ? parseFloat((base + PRIORITY_SURCHARGE).toFixed(4)) : base;
}

/**
 * Format a USDC price for display with proper trailing zeros.
 *
 * @param price - Numeric USDC price.
 * @returns A formatted string like "0.10" or "2.35".
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Convert a numeric USDC amount to a string suitable for Stellar transactions.
 * Uses up to 7 decimal places (Stellar precision).
 *
 * @param price - Numeric USDC price.
 * @returns Stellar-compatible amount string.
 */
export function toStellarAmount(price: number): string {
  return price.toFixed(7);
}
