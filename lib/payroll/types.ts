import type { Decimal } from "decimal.js";

/** Payment modality — matches Prisma's SalaryUnit. */
export type Modalidad = "SEMANAL" | "QUINCENAL" | "MENSUAL";

export type AdjustmentKind =
  | "BONO"
  | "VIATICO"
  | "ADELANTO"
  | "EMBARGO"
  | "SOLIDARISTA"
  | "OTRA_DEDUCCION"
  | "OTRO_INGRESO";

/** A recurring or one-off adjustment already resolved for the period by the caller. */
export interface ResolvedAdjustment {
  type: AdjustmentKind;
  mode: "MONTO_FIJO" | "PORCENTAJE_BRUTO";
  /** Colones (Decimal), when MONTO_FIJO. */
  amount?: Decimal;
  /** Percent (5 = 5 %), when PORCENTAJE_BRUTO. */
  ratePct?: Decimal;
  note?: string;
}

export interface IsrBracketParam {
  /** Monthly colones. */
  limiteInferior: Decimal;
  /** Monthly colones; null = infinity. */
  limiteSuperior: Decimal | null;
  /** Percent (10 = 10 %). */
  tasaPct: Decimal;
}

/** Plain mirror of PayrollParameterSet, lifted to Decimal. */
export interface EngineParams {
  tasaSem: Decimal;
  tasaIvm: Decimal;
  tasaBp: Decimal;
  horaExtraFactor: Decimal;
  horasMensuales: Decimal;
  factorSemanalAMensual: Decimal;
  isrBrackets: IsrBracketParam[];
  /** Monthly colones per dependent. */
  creditoFiscalHijoMensual: Decimal;
  creditoFiscalConyugeMensual: Decimal;
}

export interface PayrollLineInput {
  modalidad: Modalidad;
  /** Colones, in the unit of the modalidad (per week / fortnight / month). */
  salarioBase: Decimal;
  horasExtra: Decimal;
  /** Colones taken as advance this period. */
  adelanto: Decimal;
  adjustments: ResolvedAdjustment[];
  numHijos: number;
  tieneConyuge: boolean;
  params: EngineParams;
}

/** One auditable step of the calculation, rendered in the desglose panel. */
export interface TraceLine {
  concepto: string;
  /** The base the parameter was applied on, when meaningful. */
  base: string | null;
  /** Which parameter/rule was applied ("CCSS SEM 5,50 %", "tramo 10 %"). */
  parametro: string;
  /** Resulting amount (decimal string, 2 places). */
  resultado: string;
}

/** All amounts are Decimals rounded to 2 places (the rounding contract). */
export interface PayrollLineResult {
  mensualEquivalente: Decimal;
  basePeriodo: Decimal;
  /** Value of one overtime hour. */
  montoHoraExtra: Decimal;
  /** Total overtime amount for the period. */
  montoExtra: Decimal;
  bruto: Decimal;
  ccssSem: Decimal;
  ccssIvm: Decimal;
  ccssBp: Decimal;
  ccssTotal: Decimal;
  renta: Decimal;
  solidarista: Decimal;
  embargo: Decimal;
  /** Other one-off deductions (OTRA_DEDUCCION resolved amounts). */
  otrasDeducciones: Decimal;
  totalDeducciones: Decimal;
  /** bruto − ccss − renta − solidarista − embargo − otras: what the advance is checked against. */
  disponible: Decimal;
  adelanto: Decimal;
  neto: Decimal;
  /** Exact README error message when adelanto > disponible; null otherwise. */
  error: string | null;
  trace: TraceLine[];
}
