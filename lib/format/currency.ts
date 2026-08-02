import { Decimal } from "decimal.js";

/**
 * Hand-rolled colón formatter: ₡ + thousands with dot + decimals with comma.
 * ₡1.234.567,89
 *
 * Do NOT use toLocaleString('es-CR') — several runtimes return a space as the
 * thousands separator (README warning). This formatter is the only allowed way
 * to render money anywhere in the app (UI, error messages, Excel headers).
 */

export type FormatCrcOptions = {
  /** 2 (planilla, desglose — default) or 0 (panel, tablas de proyectos). */
  decimals?: 0 | 2;
  /** Omit the ₡ symbol (e.g. inside Excel cells that carry their own format). */
  symbol?: boolean;
};

export function formatCRC(
  value: Decimal | string | number,
  { decimals = 2, symbol = true }: FormatCrcOptions = {},
): string {
  const d = value instanceof Decimal ? value : new Decimal(String(value));
  const negative = d.isNegative();
  const fixed = d.abs().toFixed(decimals, Decimal.ROUND_HALF_UP);
  const [intPart, fracPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = fracPart ? `${grouped},${fracPart}` : grouped;
  return `${negative ? "−" : ""}${symbol ? "₡" : ""}${body}`;
}

/** Shorthand used all over the panel and project tables (no decimals). */
export function formatCRC0(value: Decimal | string | number): string {
  return formatCRC(value, { decimals: 0 });
}
