import { describe, expect, it } from "vitest";
import { formatNumberCR, parseNumberCR, parsePositiveCR, parseRateCR } from "../number";

describe("parseRateCR — el punto siempre es decimal", () => {
  it("lee tasas con punto decimal (el caso que rompía el simulador)", () => {
    expect(parseRateCR("10.67").toString()).toBe("10.67");
    expect(parseRateCR("10.83").toString()).toBe("10.83");
    expect(parseRateCR("26.83").toString()).toBe("26.83");
  });

  it("resuelve el caso ambiguo 4.333 como factor, no como 4333", () => {
    expect(parseRateCR("4.333").toString()).toBe("4.333");
    // El mismo texto, leído como monto, sí se agrupa
    expect(parsePositiveCR("4.333").toString()).toBe("4333");
  });

  it("lee tasas con coma decimal", () => {
    expect(parseRateCR("10,67").toString()).toBe("10.67");
    expect(parseNumberCR("1,5").toString()).toBe("1.5");
  });

  it("lee montos agrupados con punto", () => {
    expect(parseNumberCR("1.234.567").toString()).toBe("1234567");
    expect(parseNumberCR("450.000").toString()).toBe("450000");
    expect(parseNumberCR("918.000").toString()).toBe("918000");
  });

  it("lee montos con agrupación y decimales", () => {
    expect(parseNumberCR("1.234.567,89").toString()).toBe("1234567.89");
    expect(parseNumberCR("1.295.000,00").toString()).toBe("1295000");
  });

  it("lee montos planos", () => {
    expect(parseNumberCR("450000").toString()).toBe("450000");
    expect(parseNumberCR("1234.56").toString()).toBe("1234.56");
  });

  it("devuelve cero ante entradas vacías o inválidas", () => {
    expect(parseNumberCR("").toString()).toBe("0");
    expect(parseNumberCR("   ").toString()).toBe("0");
    expect(parseNumberCR("abc").toString()).toBe("0");
  });

  it("parsePositiveCR nunca devuelve negativos", () => {
    expect(parsePositiveCR("-500").toString()).toBe("0");
    expect(parsePositiveCR("500").toString()).toBe("500");
  });
});

describe("formatNumberCR", () => {
  it("muestra el decimal con coma", () => {
    expect(formatNumberCR("10.83")).toBe("10,83");
    expect(formatNumberCR(1.5)).toBe("1,5");
    expect(formatNumberCR(240)).toBe("240");
  });
});
