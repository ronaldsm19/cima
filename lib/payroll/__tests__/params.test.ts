import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { PARAMS_2026_SEED, toEngineParams } from "../params";

/**
 * Guards on the CURRENTLY configured seed. These check internal consistency,
 * not specific rates — the rates change by law and live in the database, so
 * hardcoding them here would just make the suite brittle. The one exception is
 * the worker total, which the office confirmed against its own spreadsheet.
 */
describe("PARAMS_2026_SEED", () => {
  it("el desglose de CCSS suma el total que la oficina confirmó (10,83 %)", () => {
    const total = new Decimal(PARAMS_2026_SEED.tasaSem)
      .plus(PARAMS_2026_SEED.tasaIvm)
      .plus(PARAMS_2026_SEED.tasaBp);
    expect(total.toFixed(2)).toBe("10.83");
  });

  it("los tramos van de menor a mayor y sin huecos", () => {
    const brackets = PARAMS_2026_SEED.isrBrackets;
    expect(brackets.length).toBeGreaterThan(1);
    expect(brackets[0].limiteInferior).toBe("0");
    for (let i = 1; i < brackets.length; i++) {
      // El piso de cada tramo es el techo del anterior
      expect(brackets[i].limiteInferior).toBe(brackets[i - 1].limiteSuperior);
      expect(Number(brackets[i].tasaPct)).toBeGreaterThan(Number(brackets[i - 1].tasaPct));
    }
  });

  it("el último tramo no tiene tope", () => {
    expect(PARAMS_2026_SEED.isrBrackets.at(-1)!.limiteSuperior).toBeNull();
  });

  it("las tasas están en rangos plausibles", () => {
    const total = new Decimal(PARAMS_2026_SEED.tasaSem)
      .plus(PARAMS_2026_SEED.tasaIvm)
      .plus(PARAMS_2026_SEED.tasaBp);
    expect(total.gt(5) && total.lt(20)).toBe(true);
    expect(PARAMS_2026_SEED.tasaPatronal).toBeGreaterThan(15);
    expect(PARAMS_2026_SEED.tasaPatronal).toBeLessThan(45);
    expect(PARAMS_2026_SEED.horasMensuales).toBeGreaterThan(100);
  });

  it("se convierte a parámetros del motor sin perder precisión", () => {
    const engine = toEngineParams(PARAMS_2026_SEED);
    expect(engine.tasaIvm.toString()).toBe(String(PARAMS_2026_SEED.tasaIvm));
    expect(engine.isrBrackets.length).toBe(PARAMS_2026_SEED.isrBrackets.length);
    expect(engine.creditoFiscalHijoMensual.toString()).toBe("1710");
    expect(engine.creditoFiscalConyugeMensual.toString()).toBe("2590");
  });
});
