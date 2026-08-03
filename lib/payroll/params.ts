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
  /** Employer's charges, percent — used by the simulator, not deducted. */
  tasaPatronal: number;
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
 * 2026 values, taken from the office's reference spreadsheet
 * (Simulador_Planilla_CCSS_Costa_Rica.xlsx, citing "Ministerio de Hacienda,
 * tramos de renta 2026").
 *
 * The spreadsheet gives the worker's total (10,83 %) but not its breakdown;
 * the split below assigns the difference to IVM, matching the published IVM
 * worker increase. TODO: verificar el desglose SEM/IVM/BP con la CCSS — el
 * total es lo que se deduce, pero el desglose es lo que ve la colilla.
 */
export const PARAMS_2026_SEED: PlainEngineParams = {
  tasaSem: 5.5,
  tasaIvm: 4.33,
  tasaBp: 1.0, // Σ 10,83 %
  tasaPatronal: 26.83,

  horaExtraFactor: 1.5,
  horasMensuales: 240,
  factorSemanalAMensual: 4.333,
  isrBrackets: [
    { limiteInferior: "0", limiteSuperior: "918000", tasaPct: 0 },
    { limiteInferior: "918000", limiteSuperior: "1347000", tasaPct: 10 },
    { limiteInferior: "1347000", limiteSuperior: "2364000", tasaPct: 15 },
    { limiteInferior: "2364000", limiteSuperior: "4727000", tasaPct: 20 },
    { limiteInferior: "4727000", limiteSuperior: null, tasaPct: 25 },
  ],
  creditoFiscalHijoMensual: "1710",
  creditoFiscalConyugeMensual: "2590",
};
