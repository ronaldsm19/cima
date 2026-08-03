import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { isrMensual } from "../isr";
import { toEngineParams } from "../params";
import { PARAMS_PROTOTIPO } from "./fixtures";

const params = toEngineParams(PARAMS_PROTOTIPO);

function isr(monthly: number | string): string {
  return isrMensual(new Decimal(monthly), params, 0, false).renta.toFixed(2);
}

describe("isrMensual — marginal bracket accumulation (escala del prototipo)", () => {
  it("is zero through the first bracket, inclusive of its edge", () => {
    expect(isr(0)).toBe("0.00");
    expect(isr("941999.99")).toBe("0.00");
    expect(isr(942000)).toBe("0.00");
  });

  it("taxes only the excess just above the edge", () => {
    // 0,01 above → 10 % of 0,01
    expect(isr("942000.01")).toBe("0.00"); // 0,001 rounds to 0,00
    expect(isr(942100)).toBe("10.00");
  });

  it("accumulates exactly at each bracket boundary", () => {
    expect(isr(1381000)).toBe("43900.00"); // 10 % × 439.000
    expect(isr(2423000)).toBe("200200.00"); // + 15 % × 1.042.000
    expect(isr(4845000)).toBe("684600.00"); // + 20 % × 2.422.000
  });

  it("applies the top marginal rate above the last edge", () => {
    expect(isr(6000000)).toBe("973350.00"); // 684.600 + 25 % × 1.155.000
  });

  it("emits one trace line per taxed bracket", () => {
    const { trace } = isrMensual(new Decimal(2500000), params, 0, false);
    expect(trace.filter((t) => t.concepto === "Renta — tramo")).toHaveLength(3);
  });
});
