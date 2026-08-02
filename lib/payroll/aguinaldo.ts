import { Decimal, toMoney, ZERO } from "./rounding";

/**
 * Aguinaldo: one twelfth of the gross salary earned between Dec 1 and Nov 30.
 * Not subject to CCSS nor renta. Paid at the latest on Dec 20.
 */
export function calculateAguinaldo(brutosDevengados: readonly Decimal[]): Decimal {
  const total = brutosDevengados.reduce((acc, b) => acc.plus(b), ZERO);
  return toMoney(total.div(12));
}
