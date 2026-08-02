import { Decimal } from "decimal.js";
import { calculatePayrollLine } from "@/lib/payroll/engine";
import { toEngineParams, type PlainEngineParams } from "@/lib/payroll/params";
import type { PayrollLineResult, ResolvedAdjustment } from "@/lib/payroll/types";
import type { PlainAdjustment, PlanillaLineDTO } from "./dto";

/**
 * DTO → engine input, shared by the client table (live recompute) and the
 * approval action (snapshot) so both always produce identical numbers.
 */

export function toResolvedAdjustments(adjustments: PlainAdjustment[]): ResolvedAdjustment[] {
  return adjustments.map((a) => ({
    type: a.type,
    mode: a.mode,
    amount: a.amount != null ? new Decimal(a.amount) : undefined,
    ratePct: a.ratePct != null ? new Decimal(String(a.ratePct)) : undefined,
    note: a.note,
  }));
}

export function computeLine(
  line: Pick<
    PlanillaLineDTO,
    "modalidad" | "salarioBase" | "numHijos" | "tieneConyuge" | "adjustments"
  >,
  horasExtra: number | string,
  adelanto: string,
  params: PlainEngineParams,
): PayrollLineResult {
  return calculatePayrollLine({
    modalidad: line.modalidad,
    salarioBase: new Decimal(line.salarioBase),
    horasExtra: new Decimal(String(horasExtra === "" ? 0 : horasExtra)),
    adelanto: new Decimal(adelanto === "" ? "0" : adelanto),
    adjustments: toResolvedAdjustments(line.adjustments),
    numHijos: line.numHijos,
    tieneConyuge: line.tieneConyuge,
    params: toEngineParams(params),
  });
}
