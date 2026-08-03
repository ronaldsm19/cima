import { Decimal } from "decimal.js";
import type { PlainEngineParams } from "../params";

/**
 * Frozen parameter sets for the engine tests.
 *
 * The tests must validate the FORMULAS, not whatever rates the office has
 * configured today: pinning them here means a legal change (a new CCSS rate,
 * new ISR brackets) never turns the suite red for the wrong reason. The
 * current configuration is checked separately, for internal consistency only.
 */

/** The design prototype's parameters — source of the golden payroll numbers. */
export const PARAMS_PROTOTIPO: PlainEngineParams = {
  tasaSem: 5.5,
  tasaIvm: 4.17,
  tasaBp: 1.0, // Σ 10,67 %
  tasaPatronal: 26.83,
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
  creditoFiscalHijoMensual: "0",
  creditoFiscalConyugeMensual: "0",
};

/** Helper for readable assertions on percentages. */
export const pct = (n: number) => new Decimal(String(n));
