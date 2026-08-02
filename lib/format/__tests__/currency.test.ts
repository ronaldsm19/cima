import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { formatCRC, formatCRC0 } from "../currency";

describe("formatCRC", () => {
  it("formats the canonical README example exactly", () => {
    expect(formatCRC(1234567.89)).toBe("₡1.234.567,89");
  });

  it("formats zero", () => {
    expect(formatCRC(0)).toBe("₡0,00");
  });

  it("groups thousands with dots", () => {
    expect(formatCRC(1000)).toBe("₡1.000,00");
    expect(formatCRC(999)).toBe("₡999,00");
    expect(formatCRC(1000000)).toBe("₡1.000.000,00");
  });

  it("rounds half-up to two decimals", () => {
    expect(formatCRC(999.995)).toBe("₡1.000,00");
    expect(formatCRC(0.005)).toBe("₡0,01");
  });

  it("formats without decimals (panel / project tables)", () => {
    expect(formatCRC0(7275000)).toBe("₡7.275.000");
    expect(formatCRC(1234567.89, { decimals: 0 })).toBe("₡1.234.568");
  });

  it("accepts Decimal and string inputs", () => {
    expect(formatCRC(new Decimal("456844.13"))).toBe("₡456.844,13");
    expect(formatCRC("525000")).toBe("₡525.000,00");
  });

  it("formats negatives with a minus sign", () => {
    expect(formatCRC(-1234.5)).toBe("−₡1.234,50");
  });

  it("never uses spaces as thousands separator (es-CR trap)", () => {
    expect(formatCRC(2276181.5)).not.toMatch(/\s/);
    expect(formatCRC(2276181.5)).toBe("₡2.276.181,50");
  });
});
