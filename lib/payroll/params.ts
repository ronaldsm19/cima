import { Decimal } from "./rounding";
import type { EngineParams } from "./types";

/**
 * Serializable mirror of a PayrollParameterSet — safe to cross the RSC/client
 * boundary (colones amounts as decimal strings, rates as plain numbers).
 * The engine consumes it through toEngineParams().
 */
export interface PlainEngineParams {
  tasaSem: number;
  tasaIvm: number;
  tasaBp: number;
  horaExtraFactor: number;
  horasMensuales: number;
  factorSemanalAMensual: number;
  isrBrackets: {
    limiteInferior: string; // monthly colones, decimal string
    limiteSuperior: string | null;
    tasaPct: number;
  }[];
  creditoFiscalHijoMensual: string; // monthly colones
  creditoFiscalConyugeMensual: string;
}

export function toEngineParams(plain: PlainEngineParams): EngineParams {
  return {
    tasaSem: new Decimal(String(plain.tasaSem)),
    tasaIvm: new Decimal(String(plain.tasaIvm)),
    tasaBp: new Decimal(String(plain.tasaBp)),
    horaExtraFactor: new Decimal(String(plain.horaExtraFactor)),
    horasMensuales: new Decimal(String(plain.horasMensuales)),
    factorSemanalAMensual: new Decimal(String(plain.factorSemanalAMensual)),
    isrBrackets: plain.isrBrackets
      .slice()
      .sort((a, b) => new Decimal(a.limiteInferior).cmp(new Decimal(b.limiteInferior)))
      .map((b) => ({
        limiteInferior: new Decimal(b.limiteInferior),
        limiteSuperior: b.limiteSuperior ? new Decimal(b.limiteSuperior) : null,
        tasaPct: new Decimal(String(b.tasaPct)),
      })),
    creditoFiscalHijoMensual: new Decimal(plain.creditoFiscalHijoMensual),
    creditoFiscalConyugeMensual: new Decimal(plain.creditoFiscalConyugeMensual),
  };
}

/**
 * 2026 seed values — "semilla, a verificar" (prompt-01). CCSS worker share
 * 10,67 % split per handoff default; ISR brackets from the handoff table.
 * TODO: verificar contra la normativa vigente y el Excel real de la oficina.
 */
export const PARAMS_2026_SEED: PlainEngineParams = {
  tasaSem: 5.5,
  tasaIvm: 4.17,
  tasaBp: 1.0,
  horaExtraFactor: 1.5,
  horasMensuales: 240,
  factorSemanalAMensual: 4.333,
  isrBrackets: [
    { limiteInferior: "0", limiteSuperior: "942000", tasaPct: 0 },
    { limiteInferior: "942000", limiteSuperior: "1381000", tasaPct: 10 },
    { limiteInferior: "1381000", limiteSuperior: "2423000", tasaPct: 15 },
    { limiteInferior: "2423000", limiteSuperior: "4845000", tasaPct: 20 },
    { limiteInferior: "4845000", limiteSuperior: null, tasaPct: 25 },
  ],
  // TODO: verificar — créditos fiscales por hijo y cónyuge (decreto anual)
  creditoFiscalHijoMensual: "0",
  creditoFiscalConyugeMensual: "0",
};
