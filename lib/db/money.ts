import { Decimal } from "decimal.js";

/**
 * Money storage convention (MongoDB has no Decimal support in Prisma):
 * every amount is persisted as INTEGER CENTS in a BigInt field.
 * ₡456.844,13 → 45684413n
 *
 * This module is the ONLY allowed conversion point between storage (BigInt cents),
 * math (decimal.js) and the client boundary (decimal strings). Never use Number()
 * on money and never do arithmetic on raw cents outside Decimal.
 */

/** BigInt cents (DB) → Decimal colones (math). 45684413n → 456844.13 */
export function centsToDecimal(cents: bigint): Decimal {
  return new Decimal(cents.toString()).div(100);
}

/** Decimal colones → BigInt cents, rounded half-up to the céntimo. */
export function decimalToCents(value: Decimal): bigint {
  return BigInt(value.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0));
}

/** Decimal → plain string ("456844.13") for the RSC/client boundary. */
export function decimalToString(value: Decimal): string {
  return value.toFixed(2);
}

/** BigInt cents → decimal string for the client boundary. */
export function centsToString(cents: bigint): string {
  return centsToDecimal(cents).toFixed(2);
}

/** Client-side reconstruction: decimal string → Decimal. */
export function decimalFromString(value: string): Decimal {
  return new Decimal(value);
}

/**
 * Percent/number columns are stored as Float (they are not money: 5.5, 4.17, 30).
 * Always lift them into Decimal through String() — JS shortest-roundtrip printing
 * recovers the exact decimal literal the user typed.
 */
export function numberToDecimal(value: number): Decimal {
  return new Decimal(String(value));
}
