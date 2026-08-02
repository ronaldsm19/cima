import { formatCRC } from "@/lib/format/currency";
import { Decimal, toMoney, ZERO } from "./rounding";
import type { EngineParams, TraceLine } from "./types";

/**
 * Impuesto sobre la renta al salario — monthly marginal brackets.
 * Input is the MONTHLY taxable base; brackets and credits come from the
 * versioned parameter set (they change by decree every year).
 */
export function isrMensual(
  baseMensual: Decimal,
  params: EngineParams,
  numHijos: number,
  tieneConyuge: boolean,
): { renta: Decimal; trace: TraceLine[] } {
  const trace: TraceLine[] = [];
  let total = ZERO;

  for (const bracket of params.isrBrackets) {
    if (baseMensual.lte(bracket.limiteInferior)) break;
    const cap = bracket.limiteSuperior
      ? Decimal.min(baseMensual, bracket.limiteSuperior)
      : baseMensual;
    const taxable = cap.minus(bracket.limiteInferior);
    if (taxable.lte(0) || bracket.tasaPct.isZero()) continue;
    const tax = taxable.mul(bracket.tasaPct).div(100);
    total = total.plus(tax);
    trace.push({
      concepto: "Renta — tramo",
      base: taxable.toFixed(2),
      parametro: `tramo ${bracket.tasaPct.toFixed(0)} % (sobre ${formatCRC(bracket.limiteInferior, { decimals: 0 })}${bracket.limiteSuperior ? ` a ${formatCRC(bracket.limiteSuperior, { decimals: 0 })}` : " en adelante"})`,
      resultado: toMoney(tax).toFixed(2),
    });
  }

  const creditos = params.creditoFiscalHijoMensual
    .mul(numHijos)
    .plus(tieneConyuge ? params.creditoFiscalConyugeMensual : ZERO);

  if (creditos.gt(0) && total.gt(0)) {
    trace.push({
      concepto: "Renta — créditos fiscales",
      base: total.toFixed(2),
      parametro: `${numHijos} hijo(s)${tieneConyuge ? " + cónyuge" : ""}`,
      resultado: creditos.neg().toFixed(2),
    });
  }

  const renta = Decimal.max(ZERO, total.minus(creditos));
  return { renta, trace };
}
