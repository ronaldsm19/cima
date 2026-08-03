import { Decimal } from "decimal.js";

/**
 * Parses what a Costa Rican user actually types, where a dot is ambiguous:
 * grouping in an amount ("1.234.567") but decimals in a rate ("10.67").
 *
 * "4.333" is genuinely ambiguous — 4333 grouped, or 4,333 decimal — so the
 * caller says which it is instead of the parser guessing:
 *
 *   amount (default): a dot groups when the shape is 1-3 digits + groups of 3
 *   rate:             a dot is always the decimal point (no rate needs grouping)
 *
 * A comma always means decimals in both modes.
 */
export type NumberStyle = "amount" | "rate";

export function parseNumberCR(raw: string, style: NumberStyle = "amount"): Decimal {
  const limpio = String(raw).trim().replace(/\s/g, "");
  if (limpio === "") return new Decimal(0);

  let normalizado: string;
  if (limpio.includes(",")) {
    // Comma present → decimal separator; any dots are grouping
    normalizado = limpio.replace(/\./g, "").replace(",", ".");
  } else if (style === "rate") {
    normalizado = limpio;
  } else {
    const pareceAgrupado = /^\d{1,3}(\.\d{3})+$/.test(limpio);
    normalizado = pareceAgrupado ? limpio.replace(/\./g, "") : limpio;
  }

  try {
    const d = new Decimal(normalizado);
    return d.isFinite() ? d : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

/** Amounts (₡) that can never be negative. */
export function parsePositiveCR(raw: string): Decimal {
  const d = parseNumberCR(raw, "amount");
  return d.gte(0) ? d : new Decimal(0);
}

/** Percentages and factors, where a dot always means decimals. */
export function parseRateCR(raw: string): Decimal {
  const d = parseNumberCR(raw, "rate");
  return d.gte(0) ? d : new Decimal(0);
}

/** Number → display string with Spanish decimal comma ("10.67" → "10,67"). */
export function formatNumberCR(value: Decimal | number | string): string {
  return String(value).replace(".", ",");
}
