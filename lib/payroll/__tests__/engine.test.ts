import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { calculatePayrollLine, calculatePeriodTotals } from "../engine";
import { PARAMS_2026_SEED, toEngineParams } from "../params";
import type { PayrollLineInput, ResolvedAdjustment } from "../types";

/**
 * Golden cases verified against the v2 design prototype (its sample employees).
 *
 * Rounding note: the prototype rounds only at display time, so lines with
 * overtime can drift ₡0,01 between its printed columns (they don't sum). This
 * engine follows the rounding CONTRACT instead — every concept rounded to 2
 * places, derived values computed from rounded concepts — so bruto − deducciones
 * − adelanto === neto always holds. Where that differs from the prototype's
 * display by one céntimo, the contract value is asserted and the prototype
 * value noted.
 */

const params = toEngineParams(PARAMS_2026_SEED);

function line(input: Partial<PayrollLineInput>): PayrollLineInput {
  return {
    modalidad: "MENSUAL",
    salarioBase: new Decimal(0),
    horasExtra: new Decimal(0),
    adelanto: new Decimal(0),
    adjustments: [],
    numHijos: 0,
    tieneConyuge: false,
    params,
    ...input,
  };
}

const solidarista = (pct: number): ResolvedAdjustment => ({
  type: "SOLIDARISTA",
  mode: "PORCENTAJE_BRUTO",
  ratePct: new Decimal(String(pct)),
});

const embargo = (monto: number): ResolvedAdjustment => ({
  type: "EMBARGO",
  mode: "MONTO_FIJO",
  amount: new Decimal(String(monto)),
});

describe("modalidad MENSUAL — e1 Esteban ₡1.050.000, solidarista 5 %", () => {
  it("no overtime: fortnight cut and zero-bracket renta prorated", () => {
    const r = calculatePayrollLine(
      line({
        modalidad: "MENSUAL",
        salarioBase: new Decimal(1050000),
        adjustments: [solidarista(5)],
      }),
    );
    expect(r.basePeriodo.toFixed(2)).toBe("525000.00");
    expect(r.mensualEquivalente.toFixed(2)).toBe("1050000.00");
    expect(r.bruto.toFixed(2)).toBe("525000.00");
    // ISR(1.050.000) = 10 % de 108.000 = 10.800 → ÷2 = 5.400
    expect(r.renta.toFixed(2)).toBe("5400.00");
    expect(r.ccssTotal.toFixed(2)).toBe("56017.50"); // 525.000 × 10,67 %
    expect(r.solidarista.toFixed(2)).toBe("26250.00");
    expect(r.error).toBeNull();
  });

  it("with 4 h overtime: hora extra 6.562,50 and renta bracket via mensualEq + extra×2", () => {
    const r = calculatePayrollLine(
      line({
        modalidad: "MENSUAL",
        salarioBase: new Decimal(1050000),
        horasExtra: new Decimal(4),
        adjustments: [solidarista(5)],
      }),
    );
    expect(r.montoHoraExtra.toFixed(2)).toBe("6562.50"); // 1.050.000 ÷ 240 × 1,5
    expect(r.montoExtra.toFixed(2)).toBe("26250.00");
    expect(r.bruto.toFixed(2)).toBe("551250.00");
    // ISR(1.050.000 + 52.500 = 1.102.500) = 16.050 → ÷2 = 8.025
    expect(r.renta.toFixed(2)).toBe("8025.00");
    // CCSS parts rounded separately: SEM 30.318,75 + IVM 22.987,13 + BP 5.512,50
    expect(r.ccssSem.toFixed(2)).toBe("30318.75");
    expect(r.ccssIvm.toFixed(2)).toBe("22987.13");
    expect(r.ccssBp.toFixed(2)).toBe("5512.50");
    expect(r.ccssTotal.toFixed(2)).toBe("58818.38");
    expect(r.solidarista.toFixed(2)).toBe("27562.50");
    // Contract: 551.250,00 − 58.818,38 − 8.025,00 − 27.562,50 = 456.844,12
    // (prototype displays 456.844,13 because it rounds only at display)
    expect(r.neto.toFixed(2)).toBe("456844.12");
  });
});

describe("modalidad SEMANAL — e3 Josué ₡118.500, embargo ₡52.000, 6 h extra", () => {
  const r = calculatePayrollLine(
    line({
      modalidad: "SEMANAL",
      salarioBase: new Decimal(118500),
      horasExtra: new Decimal(6),
      adjustments: [embargo(52000)],
    }),
  );

  it("weekly modality doubles the base per fortnight cut", () => {
    expect(r.mensualEquivalente.toFixed(2)).toBe("513460.50"); // 118.500 × 4,333
    expect(r.basePeriodo.toFixed(2)).toBe("237000.00");
  });

  it("computes overtime from the monthly equivalent", () => {
    expect(r.montoExtra.toFixed(2)).toBe("19254.77");
    expect(r.bruto.toFixed(2)).toBe("256254.77");
  });

  it("stays in the 0 % renta bracket", () => {
    // 513.460,50 + 38.509,54 = 551.970,04 < 942.000
    expect(r.renta.toFixed(2)).toBe("0.00");
  });

  it("applies the fixed embargo and derives neto from rounded concepts", () => {
    expect(r.ccssTotal.toFixed(2)).toBe("27342.38");
    expect(r.embargo.toFixed(2)).toBe("52000.00");
    // Contract: 256.254,77 − 27.342,38 − 52.000 = 176.912,39
    // (prototype displays 176.912,38 — display-time rounding drift)
    expect(r.neto.toFixed(2)).toBe("176912.39");
  });
});

describe("modalidad QUINCENAL — e5 Adrián ₡365.000, solidarista 3 %, adelanto ₡50.000", () => {
  const r = calculatePayrollLine(
    line({
      modalidad: "QUINCENAL",
      salarioBase: new Decimal(365000),
      adelanto: new Decimal(50000),
      adjustments: [solidarista(3)],
    }),
  );

  it("matches the prototype exactly (no fractional intermediates)", () => {
    expect(r.mensualEquivalente.toFixed(2)).toBe("730000.00");
    expect(r.bruto.toFixed(2)).toBe("365000.00");
    expect(r.renta.toFixed(2)).toBe("0.00");
    expect(r.ccssTotal.toFixed(2)).toBe("38945.50");
    expect(r.solidarista.toFixed(2)).toBe("10950.00");
    expect(r.disponible.toFixed(2)).toBe("315104.50");
    expect(r.neto.toFixed(2)).toBe("265104.50");
    expect(r.error).toBeNull();
  });
});

describe("remaining prototype employees (exact, no drift)", () => {
  it("e2 Marvin — mensual ₡920.000, solidarista 5 %", () => {
    const r = calculatePayrollLine(
      line({ salarioBase: new Decimal(920000), adjustments: [solidarista(5)] }),
    );
    expect(r.bruto.toFixed(2)).toBe("460000.00");
    expect(r.ccssTotal.toFixed(2)).toBe("49082.00");
    expect(r.renta.toFixed(2)).toBe("0.00"); // 920.000 < 942.000
    expect(r.solidarista.toFixed(2)).toBe("23000.00");
    expect(r.neto.toFixed(2)).toBe("387918.00");
  });

  it("e4 Randall — semanal ₡112.000", () => {
    const r = calculatePayrollLine(
      line({ modalidad: "SEMANAL", salarioBase: new Decimal(112000) }),
    );
    expect(r.bruto.toFixed(2)).toBe("224000.00");
    expect(r.ccssTotal.toFixed(2)).toBe("23900.80");
    expect(r.neto.toFixed(2)).toBe("200099.20");
  });

  it("e6 Yendry — quincenal ₡245.000", () => {
    const r = calculatePayrollLine(
      line({ modalidad: "QUINCENAL", salarioBase: new Decimal(245000) }),
    );
    expect(r.ccssTotal.toFixed(2)).toBe("26141.50");
    expect(r.neto.toFixed(2)).toBe("218858.50");
  });

  it("e7 Kimberly — mensual ₡680.000, solidarista 3 %", () => {
    const r = calculatePayrollLine(
      line({ salarioBase: new Decimal(680000), adjustments: [solidarista(3)] }),
    );
    expect(r.bruto.toFixed(2)).toBe("340000.00");
    expect(r.ccssTotal.toFixed(2)).toBe("36278.00");
    expect(r.solidarista.toFixed(2)).toBe("10200.00");
    expect(r.neto.toFixed(2)).toBe("293522.00");
  });

  it("e8 Karla — quincenal ₡310.000", () => {
    const r = calculatePayrollLine(
      line({ modalidad: "QUINCENAL", salarioBase: new Decimal(310000) }),
    );
    expect(r.ccssTotal.toFixed(2)).toBe("33077.00");
    expect(r.neto.toFixed(2)).toBe("276923.00");
  });
});

describe("adelanto validation", () => {
  it("allows adelanto exactly equal to disponible (neto 0)", () => {
    const base = calculatePayrollLine(
      line({ modalidad: "QUINCENAL", salarioBase: new Decimal(365000) }),
    );
    const r = calculatePayrollLine(
      line({
        modalidad: "QUINCENAL",
        salarioBase: new Decimal(365000),
        adelanto: base.disponible,
      }),
    );
    expect(r.error).toBeNull();
    expect(r.neto.toFixed(2)).toBe("0.00");
  });

  it("rejects adelanto above disponible with the exact README message", () => {
    const r = calculatePayrollLine(
      line({
        modalidad: "MENSUAL",
        salarioBase: new Decimal(1050000),
        horasExtra: new Decimal(4),
        adelanto: new Decimal(600000),
        adjustments: [solidarista(5)],
      }),
    );
    expect(r.error).toBe(
      "El adelanto de ₡600.000,00 supera el neto disponible de ₡456.844,12. Bajá el monto o repartilo en dos períodos.",
    );
  });
});

describe("rounding invariants (contract)", () => {
  const cases: PayrollLineInput[] = [
    line({ modalidad: "MENSUAL", salarioBase: new Decimal(1050000), horasExtra: new Decimal(4), adjustments: [solidarista(5)] }),
    line({ modalidad: "SEMANAL", salarioBase: new Decimal(118500), horasExtra: new Decimal(6), adjustments: [embargo(52000)] }),
    line({ modalidad: "SEMANAL", salarioBase: new Decimal(133333.33), horasExtra: new Decimal(2.5), adjustments: [solidarista(7.25), embargo(12345.67)], adelanto: new Decimal(10000) }),
    line({ modalidad: "QUINCENAL", salarioBase: new Decimal(987654.32), horasExtra: new Decimal(11.75), adjustments: [solidarista(3)] }),
    line({ modalidad: "MENSUAL", salarioBase: new Decimal(5500000), horasExtra: new Decimal(9), adjustments: [solidarista(5), embargo(250000)], adelanto: new Decimal(100000) }),
  ];

  it("bruto − deducciones − adelanto === neto on rounded values, always", () => {
    for (const input of cases) {
      const r = calculatePayrollLine(input);
      const derived = r.bruto
        .minus(r.ccssTotal)
        .minus(r.renta)
        .minus(r.solidarista)
        .minus(r.embargo)
        .minus(r.otrasDeducciones)
        .minus(r.adelanto);
      expect(derived.toFixed(2)).toBe(r.neto.toFixed(2));
      expect(r.ccssSem.plus(r.ccssIvm).plus(r.ccssBp).toFixed(2)).toBe(
        r.ccssTotal.toFixed(2),
      );
      expect(r.totalDeducciones.toFixed(2)).toBe(
        r.ccssTotal.plus(r.renta).plus(r.solidarista).plus(r.embargo).plus(r.otrasDeducciones).toFixed(2),
      );
    }
  });

  it("period totals equal the sum of the rounded lines", () => {
    const results = cases.map(calculatePayrollLine);
    const totals = calculatePeriodTotals(results);
    const netoSum = results.reduce((acc, r) => acc.plus(r.neto), new Decimal(0));
    expect(totals.neto.toFixed(2)).toBe(netoSum.toFixed(2));
    const brutoSum = results.reduce((acc, r) => acc.plus(r.bruto), new Decimal(0));
    expect(totals.bruto.toFixed(2)).toBe(brutoSum.toFixed(2));
  });

  it("handles zero and fractional hours without NaN", () => {
    const r = calculatePayrollLine(
      line({ modalidad: "SEMANAL", salarioBase: new Decimal(118500), horasExtra: new Decimal(2.5) }),
    );
    expect(r.neto.isNaN()).toBe(false);
    expect(r.montoExtra.gt(0)).toBe(true);
  });
});

describe("tax credits", () => {
  const paramsWithCredits = toEngineParams({
    ...PARAMS_2026_SEED,
    creditoFiscalHijoMensual: "1500",
    creditoFiscalConyugeMensual: "2500",
  });

  it("reduces monthly renta by hijo/cónyuge credits, floored at zero", () => {
    const withCredits = calculatePayrollLine(
      line({
        salarioBase: new Decimal(1050000),
        numHijos: 2,
        tieneConyuge: true,
        params: paramsWithCredits,
      }),
    );
    // ISR(1.050.000) = 10.800 − (2×1.500 + 2.500) = 5.300 → ÷2 = 2.650
    expect(withCredits.renta.toFixed(2)).toBe("2650.00");

    const floored = calculatePayrollLine(
      line({
        salarioBase: new Decimal(950000), // ISR = 800 mensual, credits exceed it
        numHijos: 2,
        tieneConyuge: true,
        params: paramsWithCredits,
      }),
    );
    expect(floored.renta.toFixed(2)).toBe("0.00");
  });
});
