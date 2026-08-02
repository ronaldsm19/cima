import type { PlainEngineParams } from "@/lib/payroll/params";

/**
 * Serializable planilla payload for the client table. All money travels as
 * decimal strings (never BigInt/Decimal across the boundary).
 */

export interface PlainAdjustment {
  type: "SOLIDARISTA" | "EMBARGO" | "OTRA_DEDUCCION";
  mode: "MONTO_FIJO" | "PORCENTAJE_BRUTO";
  amount?: string; // colones
  ratePct?: number;
  note?: string;
}

/** Frozen amounts (only present once the period is approved). */
export interface LineSnapshot {
  basePeriodo: string;
  montoExtra: string;
  bruto: string;
  ccssTotal: string;
  renta: string;
  solidarista: string;
  embargo: string;
  otrasDeducciones: string;
  neto: string;
  trace: { concepto: string; base: string | null; parametro: string; resultado: string }[];
}

export interface PlanillaLineDTO {
  itemId: string;
  employeeId: string;
  nombre: string;
  puesto: string;
  cedula: string;
  iban: string | null;
  modalidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
  salarioBase: string; // colones, in the unit of the modalidad
  numHijos: number;
  tieneConyuge: boolean;
  adjustments: PlainAdjustment[];
  // Editable inputs (current persisted values)
  horasExtra: number;
  adelanto: string; // colones
  pagado: boolean;
  paidAt: string | null;
  snapshot: LineSnapshot | null;
}

export interface PeriodOptionDTO {
  slug: string;
  label: string;
  status: "BORRADOR" | "APROBADA" | "PAGADA";
}

export interface PlanillaDTO {
  periodId: string;
  slug: string;
  label: string;
  status: "BORRADOR" | "APROBADA" | "PAGADA";
  payDate: string;
  lines: PlanillaLineDTO[];
  params: PlainEngineParams;
  permisos: {
    editar: boolean;
    aprobar: boolean;
    marcarPagos: boolean;
    generarColillas: boolean;
  };
}

export const MODALIDAD_LABEL: Record<PlanillaLineDTO["modalidad"], string> = {
  MENSUAL: "mensual",
  QUINCENAL: "quincenal",
  SEMANAL: "semanal ×2",
};
