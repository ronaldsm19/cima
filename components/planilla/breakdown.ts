import { Decimal } from "decimal.js";
import { parsePositiveCR } from "@/lib/format/number";
import type { PlainEngineParams } from "@/lib/payroll/params";
import { computeLine } from "@/lib/planilla/compute";
import type { PlanillaLineDTO } from "@/lib/planilla/dto";

/** Normalized per-line amounts for table cells and the desglose panel —
 *  frozen snapshot when the period is approved, live engine result otherwise. */
export interface LineBreakdown {
  basePeriodo: Decimal;
  montoExtra: Decimal;
  bruto: Decimal;
  ccssTotal: Decimal;
  renta: Decimal;
  solidarista: Decimal;
  embargo: Decimal;
  otrasDeducciones: Decimal;
  /** solidarista + embargo + otras — the "Otras ded." column. */
  otrasColumna: Decimal;
  adelanto: Decimal;
  neto: Decimal;
  error: string | null;
  frozen: boolean;
}

export function lineBreakdown(
  line: PlanillaLineDTO,
  horas: string | number,
  adelanto: string,
  params: PlainEngineParams,
): LineBreakdown {
  if (line.snapshot) {
    const s = line.snapshot;
    const solidarista = new Decimal(s.solidarista);
    const embargo = new Decimal(s.embargo);
    const otras = new Decimal(s.otrasDeducciones);
    return {
      basePeriodo: new Decimal(s.basePeriodo),
      montoExtra: new Decimal(s.montoExtra),
      bruto: new Decimal(s.bruto),
      ccssTotal: new Decimal(s.ccssTotal),
      renta: new Decimal(s.renta),
      solidarista,
      embargo,
      otrasDeducciones: otras,
      otrasColumna: solidarista.plus(embargo).plus(otras),
      adelanto: new Decimal(line.adelanto),
      neto: new Decimal(s.neto),
      error: null,
      frozen: true,
    };
  }

  const r = computeLine(line, horas, sanitizeMoney(adelanto), params);
  return {
    basePeriodo: r.basePeriodo,
    montoExtra: r.montoExtra,
    bruto: r.bruto,
    ccssTotal: r.ccssTotal,
    renta: r.renta,
    solidarista: r.solidarista,
    embargo: r.embargo,
    otrasDeducciones: r.otrasDeducciones,
    otrasColumna: r.solidarista.plus(r.embargo).plus(r.otrasDeducciones),
    adelanto: r.adelanto,
    neto: r.neto,
    error: r.error,
    frozen: false,
  };
}

/** Input field text → decimal string ("50.000,50" · "50000.5" · "" → "0"). */
export function sanitizeMoney(raw: string): string {
  return parsePositiveCR(raw).toString();
}

/** Hours field text → bounded number with 2 decimals. */
export function sanitizeHours(raw: string): number {
  const value = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(200, Math.round(value * 100) / 100);
}
