import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { brutoANeto, netoABruto, type SimuladorParams } from "../simulator";

/**
 * Golden values come from the office's reference spreadsheet
 * ("Simulador_Planilla_CCSS_Costa_Rica.xlsx"), using ITS parameters — so these
 * tests validate the formulas independently of whatever is configured in the
 * system today.
 *
 * The spreadsheet's own reverse formula is wrong above the second bracket (it
 * subtracts the tax accrued in the lower brackets instead of adding it), so
 * from the third bracket up the expectation is a round trip: the resolved
 * gross must reproduce the requested net exactly.
 */

const EXCEL: SimuladorParams = {
  tasaTrabajador: new Decimal("10.83"),
  tasaPatronal: new Decimal("26.83"),
  isrBrackets: [
    { limiteInferior: new Decimal(0), limiteSuperior: new Decimal(918_000), tasaPct: new Decimal(0) },
    { limiteInferior: new Decimal(918_000), limiteSuperior: new Decimal(1_347_000), tasaPct: new Decimal(10) },
    { limiteInferior: new Decimal(1_347_000), limiteSuperior: new Decimal(2_364_000), tasaPct: new Decimal(15) },
    { limiteInferior: new Decimal(2_364_000), limiteSuperior: new Decimal(4_727_000), tasaPct: new Decimal(20) },
    { limiteInferior: new Decimal(4_727_000), limiteSuperior: null, tasaPct: new Decimal(25) },
  ],
  creditoFiscalHijoMensual: new Decimal(1_710),
  creditoFiscalConyugeMensual: new Decimal(2_590),
  // Unused by the simulator but required by EngineParams
  tasaSem: new Decimal(0),
  tasaIvm: new Decimal(0),
  tasaBp: new Decimal(0),
  horaExtraFactor: new Decimal("1.5"),
  horasMensuales: new Decimal(240),
  factorSemanalAMensual: new Decimal("4.333"),
};

const bruto = (n: number | string, hijos = 0, conyuge = false, otros = 0) =>
  brutoANeto(
    {
      bruto: new Decimal(n),
      numHijos: hijos,
      tieneConyuge: conyuge,
      otrosRebajos: new Decimal(otros),
    },
    EXCEL,
  );

const neto = (n: number | string, hijos = 0, conyuge = false, otros = 0) =>
  netoABruto(
    {
      netoDeseado: new Decimal(n),
      numHijos: hijos,
      tieneConyuge: conyuge,
      otrosRebajos: new Decimal(otros),
    },
    EXCEL,
  );

describe("Bruto → Neto (valores del Excel de referencia)", () => {
  it("reproduce el caso por defecto del Excel: ₡450.000", () => {
    const r = bruto(450_000);
    expect(r.cargasTrabajador.toFixed(2)).toBe("48735.00");
    expect(r.renta.toFixed(2)).toBe("0.00"); // por debajo del tramo exento
    expect(r.neto.toFixed(2)).toBe("401265.00");
    expect(r.cargasPatronales.toFixed(2)).toBe("120735.00");
    expect(r.costoTotalPatrono.toFixed(2)).toBe("570735.00");
  });

  it("aplica la escala progresiva por tramos", () => {
    // 1.500.000 → 10 % sobre (1.347.000−918.000) + 15 % sobre (1.500.000−1.347.000)
    const r = bruto(1_500_000);
    expect(r.renta.toFixed(2)).toBe("65850.00");
    expect(r.cargasTrabajador.toFixed(2)).toBe("162450.00");
    expect(r.neto.toFixed(2)).toBe("1271700.00");
  });

  it("cubre el tramo superior del 25 %", () => {
    // 42.900 + 152.550 + 472.600 + 25 % sobre (5.000.000−4.727.000)
    const r = bruto(5_000_000);
    expect(r.renta.toFixed(2)).toBe("736300.00");
  });

  it("descuenta los créditos familiares sin pasarse del impuesto", () => {
    const conHijos = bruto(1_000_000, 2, true);
    // ISR bruto = 10 % de 82.000 = 8.200 · créditos = 2×1.710 + 2.590 = 6.010
    expect(conHijos.creditosAplicados.toFixed(2)).toBe("6010.00");
    expect(conHijos.renta.toFixed(2)).toBe("2190.00");

    // Sin impuesto que compensar, el crédito no genera devolución
    const sinImpuesto = bruto(450_000, 3, true);
    expect(sinImpuesto.creditosAplicados.toFixed(2)).toBe("0.00");
    expect(sinImpuesto.renta.toFixed(2)).toBe("0.00");
  });

  it("resta otros rebajos del neto sin tocar el impuesto", () => {
    const r = bruto(450_000, 0, false, 50_000);
    expect(r.renta.toFixed(2)).toBe("0.00");
    expect(r.neto.toFixed(2)).toBe("351265.00");
  });
});

describe("Neto → Bruto", () => {
  it("reproduce el caso por defecto del Excel: neto ₡400.000", () => {
    const r = neto(400_000);
    // El Excel da 448.581,36144443194
    expect(r.bruto.toFixed(2)).toBe("448581.36");
    expect(r.cargasTrabajador.toFixed(2)).toBe("48581.36");
    expect(r.renta.toFixed(2)).toBe("0.00");
    expect(r.netoComprobado.toFixed(2)).toBe("400000.00");
    expect(r.cargasPatronales.toFixed(2)).toBe("120354.38");
    expect(r.costoTotalPatrono.toFixed(2)).toBe("568935.74");
  });

  it("cierra el círculo en cada tramo (donde el Excel se equivoca)", () => {
    for (const salarioBruto of [500_000, 1_000_000, 1_271_700, 1_500_000, 2_500_000, 5_000_000]) {
      const ida = bruto(salarioBruto);
      const vuelta = neto(ida.neto);
      expect(vuelta.bruto.minus(salarioBruto).abs().lte("0.02")).toBe(true);
      // El neto vuelve exacto: se elige el céntimo de bruto más cercano
      expect(vuelta.netoComprobado.toFixed(2)).toBe(ida.neto.toFixed(2));
    }
  });

  it("devuelve el neto pedido al céntimo, no aproximado", () => {
    for (const objetivo of [400_000, 900_000, 1_271_700, 1_800_000, 3_000_000]) {
      const r = neto(objetivo);
      expect(r.netoComprobado.toFixed(2)).toBe(new Decimal(objetivo).toFixed(2));
    }
  });

  it("el tramo 3 exige más bruto que la fórmula del Excel", () => {
    // Con neto 1.271.700 el bruto correcto es 1.500.000; la fórmula del Excel
    // da ≈1.384.320 porque resta el impuesto de los tramos inferiores.
    const r = neto(1_271_700);
    expect(r.bruto.toFixed(0)).toBe("1500000");
    expect(r.bruto.gt(1_384_400)).toBe(true);
  });

  it("toma en cuenta otros rebajos y créditos familiares", () => {
    const conRebajos = neto(400_000, 0, false, 50_000);
    expect(conRebajos.netoComprobado.toFixed(2)).toBe("400000.00");
    expect(conRebajos.otrosRebajos.toFixed(2)).toBe("50000.00");

    const conCreditos = neto(1_000_000, 2, true);
    expect(conCreditos.netoComprobado.toFixed(2)).toBe("1000000.00");
  });

  it("no devuelve brutos negativos ni NaN en los bordes", () => {
    for (const objetivo of [0, 1, 100, 818_580]) {
      const r = neto(objetivo);
      expect(r.bruto.isNaN()).toBe(false);
      expect(r.bruto.gte(0)).toBe(true);
    }
  });
});
