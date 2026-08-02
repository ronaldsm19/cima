import { formatCRC } from "@/lib/format/currency";
import { Decimal } from "@/lib/payroll/rounding";

/**
 * Abono (client payment) validation — pure. A payment must be > 0 and must not
 * exceed the project's pending balance. Messages are the literal README texts.
 */
export function validateAbono(
  monto: Decimal,
  saldoPendiente: Decimal,
): string | null {
  if (monto.lte(0)) {
    return "El abono tiene que ser mayor que cero. Revisá el monto.";
  }
  if (monto.gt(saldoPendiente)) {
    return `El abono de ${formatCRC(monto)} supera el saldo pendiente de ${formatCRC(saldoPendiente)}. Registrá ${formatCRC(saldoPendiente)} para cerrar el proyecto, o corregí el monto acordado.`;
  }
  return null;
}
