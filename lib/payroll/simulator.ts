import { isrMensual } from "./isr";
import { Decimal, toMoney, ZERO } from "./rounding";
import type { EngineParams } from "./types";

/**
 * Standalone monthly simulator — the two directions of the office's reference
 * spreadsheet ("Simulador Planilla CCSS Costa Rica"):
 *
 *   1. Bruto → Neto: what the employee takes home and what the employer pays.
 *   2. Neto → Bruto: what gross salary yields a desired take-home.
 *
 * Monthly figures, no fortnight proration — this is a what-if calculator, not
 * the payroll engine. It shares the same ISR bracket logic and the same
 * rounding contract so both always agree on the same inputs.
 *
 * NOTE on the reference spreadsheet: its reverse formula SUBTRACTS the tax
 * already accrued in the lower brackets instead of adding it, so it only
 * returns the right gross for salaries inside the first two brackets. This
 * implementation derives the gross correctly and then verifies it against the
 * forward calculation, falling back to bisection if the algebra can't hold
 * (e.g. when tax credits zero out the tax).
 */

export interface SimuladorParams extends EngineParams {
  /** Worker's social charges, percent (10.83 = 10,83 %). */
  tasaTrabajador: Decimal;
  /** Employer's social charges, percent (26.83 = 26,83 %). */
  tasaPatronal: Decimal;
}

export interface BrutoANetoInput {
  /** Monthly gross salary, colones. */
  bruto: Decimal;
  numHijos: number;
  tieneConyuge: boolean;
  /** Any other deduction the office applies (embargos, solidarista, …). */
  otrosRebajos: Decimal;
}

export interface BrutoANetoResult {
  bruto: Decimal;
  cargasTrabajador: Decimal;
  renta: Decimal;
  /** Credits actually used — never more than the tax they offset. */
  creditosAplicados: Decimal;
  otrosRebajos: Decimal;
  neto: Decimal;
  cargasPatronales: Decimal;
  /** bruto + cargas patronales: what the employee really costs. */
  costoTotalPatrono: Decimal;
}

export function brutoANeto(input: BrutoANetoInput, params: SimuladorParams): BrutoANetoResult {
  const bruto = toMoney(input.bruto);
  const cargasTrabajador = toMoney(bruto.mul(params.tasaTrabajador).div(100));

  // Tax before credits, to know how much of the credit is actually usable
  const sinCreditos = isrMensual(bruto, { ...params, creditoFiscalHijoMensual: ZERO, creditoFiscalConyugeMensual: ZERO }, 0, false).renta;
  const creditosDisponibles = params.creditoFiscalHijoMensual
    .mul(input.numHijos)
    .plus(input.tieneConyuge ? params.creditoFiscalConyugeMensual : ZERO);
  const creditosAplicados = toMoney(Decimal.min(creditosDisponibles, sinCreditos));

  const renta = toMoney(
    isrMensual(bruto, params, input.numHijos, input.tieneConyuge).renta,
  );
  const otrosRebajos = toMoney(input.otrosRebajos);
  const neto = bruto.minus(cargasTrabajador).minus(renta).minus(otrosRebajos);
  const cargasPatronales = toMoney(bruto.mul(params.tasaPatronal).div(100));

  return {
    bruto,
    cargasTrabajador,
    renta,
    creditosAplicados,
    otrosRebajos,
    neto,
    cargasPatronales,
    costoTotalPatrono: bruto.plus(cargasPatronales),
  };
}

export interface NetoABrutoInput {
  /** Desired monthly take-home, colones. */
  netoDeseado: Decimal;
  numHijos: number;
  tieneConyuge: boolean;
  otrosRebajos: Decimal;
}

export interface NetoABrutoResult extends BrutoANetoResult {
  netoDeseado: Decimal;
  /** Recomputed net from the resolved gross — should equal netoDeseado. */
  netoComprobado: Decimal;
  /** True when the algebra had to be refined numerically. */
  aproximado: boolean;
}

/**
 * Solves the gross salary that produces a target net.
 *
 * Inside bracket i (limits [lo, hi], rate r) with A = tax accrued in the
 * brackets below it:
 *
 *   neto = bruto − bruto·c − [A + (bruto − lo)·r − créditos] − otros
 *   ⇒ bruto = (neto + otros + A − lo·r − créditos) / (1 − c − r)
 *
 * The `+ A` is the term the reference spreadsheet gets wrong: tax already paid
 * in the lower brackets means MORE gross is needed, not less.
 */
export function netoABruto(input: NetoABrutoInput, params: SimuladorParams): NetoABrutoResult {
  const objetivo = input.netoDeseado.plus(input.otrosRebajos);
  const c = params.tasaTrabajador.div(100);
  const creditos = params.creditoFiscalHijoMensual
    .mul(input.numHijos)
    .plus(input.tieneConyuge ? params.creditoFiscalConyugeMensual : ZERO);

  const brackets = params.isrBrackets;
  let acumulado = ZERO; // tax accrued in the brackets below the current one
  let bruto: Decimal | null = null;

  for (const [i, b] of brackets.entries()) {
    const r = b.tasaPct.div(100);
    const esUltimo = i === brackets.length - 1 || b.limiteSuperior === null;

    // Highest net still inside this bracket (at bruto = limiteSuperior)
    if (!esUltimo && b.limiteSuperior) {
      const impuestoEnTope = acumulado.plus(
        b.limiteSuperior.minus(b.limiteInferior).mul(r),
      );
      const netoTope = b.limiteSuperior
        .minus(b.limiteSuperior.mul(c))
        .minus(Decimal.max(ZERO, impuestoEnTope.minus(creditos)));
      if (objetivo.gt(netoTope)) {
        acumulado = impuestoEnTope;
        continue;
      }
    }

    const denominador = new Decimal(1).minus(c).minus(r);
    if (denominador.lte(0)) break; // pathological rates — fall through to bisection
    bruto = objetivo
      .plus(acumulado)
      .minus(b.limiteInferior.mul(r))
      .minus(creditos)
      .div(denominador);
    break;
  }

  // Verify against the forward calculation; refine numerically if the algebra
  // missed (credits flooring the tax at zero is the realistic case).
  let aproximado = false;
  const forward = (g: Decimal) =>
    brutoANeto(
      { bruto: g, numHijos: input.numHijos, tieneConyuge: input.tieneConyuge, otrosRebajos: input.otrosRebajos },
      params,
    ).neto;

  if (bruto === null || bruto.lte(0) || forward(bruto).minus(input.netoDeseado).abs().gt("0.01")) {
    const refinado = bisect(input.netoDeseado, forward);
    if (refinado) {
      aproximado = bruto !== null;
      bruto = refinado;
    }
  }

  // The exact gross is a real number; rounding it to céntimos shifts the net by
  // a fraction of one. Pick the céntimo that lands closest to the target — the
  // best answer available, since not every net is exactly reachable.
  if (bruto !== null && bruto.gt(0)) {
    const candidatos = [-1, 0, 1].map((delta) =>
      toMoney(bruto!).plus(new Decimal(delta).div(100)),
    );
    bruto = candidatos.reduce((mejor, c) =>
      forward(c).minus(input.netoDeseado).abs().lt(forward(mejor).minus(input.netoDeseado).abs())
        ? c
        : mejor,
    );
  }

  const resultado = brutoANeto(
    {
      bruto: bruto ?? ZERO,
      numHijos: input.numHijos,
      tieneConyuge: input.tieneConyuge,
      otrosRebajos: input.otrosRebajos,
    },
    params,
  );

  return {
    ...resultado,
    netoDeseado: toMoney(input.netoDeseado),
    netoComprobado: resultado.neto,
    aproximado,
  };
}

/** Bisection fallback: the net grows monotonically with the gross. */
function bisect(objetivo: Decimal, forward: (g: Decimal) => Decimal): Decimal | null {
  let lo = ZERO;
  let hi = objetivo.mul(4).plus(1_000_000);
  for (let i = 0; i < 80; i++) {
    const mid = lo.plus(hi).div(2);
    const neto = forward(mid);
    if (neto.minus(objetivo).abs().lte("0.005")) return toMoney(mid);
    if (neto.lt(objetivo)) lo = mid;
    else hi = mid;
  }
  return toMoney(lo.plus(hi).div(2));
}
