import { Decimal } from "decimal.js";

/**
 * Rounding contract (the auditability invariant):
 *
 * 1. Intermediates keep full precision (28 significant digits, ROUND_HALF_UP).
 * 2. Every output CONCEPT (basePeríodo, extra, bruto, each CCSS part, renta,
 *    solidarista, embargo, otras) is rounded to 2 places at the result boundary.
 * 3. Derived amounts (ccssTotal, totalDeducciones, disponible, neto, table
 *    totals) are computed FROM THE ALREADY-ROUNDED concepts, never from the
 *    unrounded intermediates.
 *
 * Consequence: the desglose panel, the table row and the totals row always sum
 * exactly — no céntimo drift anywhere in the UI, the snapshot or the reports.
 */

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/** Round a concept to céntimos (2 places, half-up). */
export function toMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export const ZERO = new Decimal(0);

export { Decimal };
