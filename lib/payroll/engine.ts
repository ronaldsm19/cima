import { formatCRC } from "@/lib/format/currency";
import { isrMensual } from "./isr";
import { Decimal, toMoney, ZERO } from "./rounding";
import type {
  EngineParams,
  Modalidad,
  PayrollLineInput,
  PayrollLineResult,
  TraceLine,
} from "./types";

/**
 * Pure payroll engine — no database access, no side effects. README formulas:
 *
 *   mensualEquivalente = mensual: base | quincenal: base×2 | semanal: base×4.333
 *   basePeríodo        = mensual: base÷2 | quincenal: base | semanal: base×2
 *   horaExtra          = (mensualEquivalente ÷ horasMensuales) × horaExtraFactor
 *   bruto              = basePeríodo + horas × horaExtra
 *   ccss               = bruto × (SEM + IVM + BP) — each part rounded separately
 *   renta              = ISR(mensualEquivalente + extra×2) ÷ 2   (monthly scale, prorated)
 *   disponible         = bruto − ccss − renta − solidarista − embargo − otras
 *   neto               = disponible − adelanto
 *
 * The prototype covers solidarista/embargo; OTRA_DEDUCCION extends "otras" the
 * same way. BONO/VIATICO/OTRO_INGRESO are accepted by the schema but not yet
 * applied here — they arrive with the office's real Excel formulas.
 */

export function mensualEquivalente(
  modalidad: Modalidad,
  base: Decimal,
  params: EngineParams,
): Decimal {
  switch (modalidad) {
    case "MENSUAL":
      return base;
    case "QUINCENAL":
      return base.mul(2);
    case "SEMANAL":
      return base.mul(params.factorSemanalAMensual);
  }
}

export function basePeriodo(modalidad: Modalidad, base: Decimal): Decimal {
  switch (modalidad) {
    case "MENSUAL":
      return base.div(2); // corte quincenal
    case "QUINCENAL":
      return base;
    case "SEMANAL":
      return base.mul(2); // dos semanas por corte
  }
}

export function calculatePayrollLine(input: PayrollLineInput): PayrollLineResult {
  const { params } = input;
  const trace: TraceLine[] = [];

  // ── Base ──────────────────────────────────────────────────────────────────
  const mensualEqRaw = mensualEquivalente(input.modalidad, input.salarioBase, params);
  const basePerRaw = basePeriodo(input.modalidad, input.salarioBase);
  const mensualEq = toMoney(mensualEqRaw);
  const basePer = toMoney(basePerRaw);
  trace.push({
    concepto: "Salario base del período",
    base: input.salarioBase.toFixed(2),
    parametro:
      input.modalidad === "MENSUAL"
        ? "mensual ÷ 2 (corte quincenal)"
        : input.modalidad === "SEMANAL"
          ? "semanal × 2 (dos semanas por corte)"
          : "quincenal",
    resultado: basePer.toFixed(2),
  });

  // ── Overtime ──────────────────────────────────────────────────────────────
  const horaExtraRaw = mensualEqRaw.div(params.horasMensuales).mul(params.horaExtraFactor);
  const montoHoraExtra = toMoney(horaExtraRaw);
  const montoExtra = toMoney(input.horasExtra.mul(horaExtraRaw));
  if (input.horasExtra.gt(0)) {
    trace.push({
      concepto: "Horas extra",
      base: montoHoraExtra.toFixed(2),
      parametro: `${input.horasExtra.toString()} h × (mensual ÷ ${params.horasMensuales.toString()}) × ${params.horaExtraFactor.toString()}`,
      resultado: montoExtra.toFixed(2),
    });
  }

  // Concepts are rounded; derived values sum the rounded concepts (rounding contract).
  const bruto = basePer.plus(montoExtra);
  trace.push({
    concepto: "Bruto del período",
    base: null,
    parametro: "base del período + horas extra",
    resultado: bruto.toFixed(2),
  });

  // ── CCSS (worker) — each part rounded separately so the desglose adds up ──
  const ccssSem = toMoney(bruto.mul(params.tasaSem).div(100));
  const ccssIvm = toMoney(bruto.mul(params.tasaIvm).div(100));
  const ccssBp = toMoney(bruto.mul(params.tasaBp).div(100));
  const ccssTotal = ccssSem.plus(ccssIvm).plus(ccssBp);
  const tasaCcss = params.tasaSem.plus(params.tasaIvm).plus(params.tasaBp);
  trace.push({
    concepto: "CCSS obrero",
    base: bruto.toFixed(2),
    parametro: `SEM ${params.tasaSem.toString()} % + IVM ${params.tasaIvm.toString()} % + BP ${params.tasaBp.toString()} % = ${tasaCcss.toString()} %`,
    resultado: ccssTotal.neg().toFixed(2),
  });

  // ── Renta — monthly scale on mensualEq + extra×2, prorated by 2 ───────────
  const baseRentaMensual = mensualEqRaw.plus(montoExtra.mul(2));
  const isr = isrMensual(baseRentaMensual, params, input.numHijos, input.tieneConyuge);
  const renta = toMoney(isr.renta.div(2));
  trace.push({
    concepto: "Impuesto sobre la renta",
    base: baseRentaMensual.toDecimalPlaces(2).toFixed(2),
    parametro: "escala mensual (mensual equivalente + extra × 2), prorrateada ÷ 2",
    resultado: renta.neg().toFixed(2),
  });
  trace.push(...isr.trace);

  // ── Adjustments ───────────────────────────────────────────────────────────
  let solidarista = ZERO;
  let embargo = ZERO;
  let otrasDeducciones = ZERO;
  for (const adj of input.adjustments) {
    if (adj.type === "SOLIDARISTA") {
      const monto = toMoney(
        adj.mode === "PORCENTAJE_BRUTO" && adj.ratePct
          ? bruto.mul(adj.ratePct).div(100)
          : (adj.amount ?? ZERO),
      );
      solidarista = solidarista.plus(monto);
      trace.push({
        concepto: "Asociación solidarista",
        base: bruto.toFixed(2),
        parametro: adj.ratePct ? `${adj.ratePct.toString()} % del bruto` : "monto fijo",
        resultado: monto.neg().toFixed(2),
      });
    } else if (adj.type === "EMBARGO") {
      const monto = toMoney(adj.amount ?? ZERO);
      embargo = embargo.plus(monto);
      trace.push({
        concepto: "Pensión alimenticia",
        base: null,
        parametro: adj.note ?? "orden judicial · monto fijo por período",
        resultado: monto.neg().toFixed(2),
      });
    } else if (adj.type === "OTRA_DEDUCCION") {
      const monto = toMoney(
        adj.mode === "PORCENTAJE_BRUTO" && adj.ratePct
          ? bruto.mul(adj.ratePct).div(100)
          : (adj.amount ?? ZERO),
      );
      otrasDeducciones = otrasDeducciones.plus(monto);
      trace.push({
        concepto: "Otra deducción",
        base: null,
        parametro: adj.note ?? "deducción puntual",
        resultado: monto.neg().toFixed(2),
      });
    }
    // BONO / VIATICO / ADELANTO / OTRO_INGRESO: not applied by the engine (see header).
  }

  // ── Disponible, adelanto, neto ────────────────────────────────────────────
  const totalDeducciones = ccssTotal
    .plus(renta)
    .plus(solidarista)
    .plus(embargo)
    .plus(otrasDeducciones);
  const disponible = bruto.minus(totalDeducciones);
  const adelanto = toMoney(input.adelanto);
  const neto = disponible.minus(adelanto);

  let error: string | null = null;
  if (adelanto.gt(disponible)) {
    error = `El adelanto de ${formatCRC(adelanto)} supera el neto disponible de ${formatCRC(disponible)}. Bajá el monto o repartilo en dos períodos.`;
  } else if (adelanto.gt(0)) {
    trace.push({
      concepto: "Adelanto del período",
      base: disponible.toFixed(2),
      parametro: "vale de caja",
      resultado: adelanto.neg().toFixed(2),
    });
  }

  trace.push({
    concepto: "Neto a pagar",
    base: null,
    parametro: "bruto − deducciones − adelanto",
    resultado: neto.toFixed(2),
  });

  return {
    mensualEquivalente: mensualEq,
    basePeriodo: basePer,
    montoHoraExtra,
    montoExtra,
    bruto,
    ccssSem,
    ccssIvm,
    ccssBp,
    ccssTotal,
    renta,
    solidarista,
    embargo,
    otrasDeducciones,
    totalDeducciones,
    disponible,
    adelanto,
    neto,
    error,
    trace,
  };
}

/** Table totals are sums of the already-rounded line concepts. */
export function calculatePeriodTotals(lines: PayrollLineResult[]) {
  const sum = (pick: (l: PayrollLineResult) => Decimal) =>
    lines.reduce((acc, l) => acc.plus(pick(l)), ZERO);
  return {
    basePeriodo: sum((l) => l.basePeriodo),
    montoExtra: sum((l) => l.montoExtra),
    bruto: sum((l) => l.bruto),
    ccssTotal: sum((l) => l.ccssTotal),
    renta: sum((l) => l.renta),
    adelanto: sum((l) => l.adelanto),
    otras: sum((l) => l.solidarista.plus(l.embargo).plus(l.otrasDeducciones)),
    neto: sum((l) => l.neto),
  };
}
