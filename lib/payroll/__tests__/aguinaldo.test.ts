import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { calculateAguinaldo } from "../aguinaldo";

describe("calculateAguinaldo", () => {
  it("is one twelfth of the gross earned Dec 1 – Nov 30", () => {
    const twelveMonths = Array.from({ length: 12 }, () => new Decimal(1050000));
    expect(calculateAguinaldo(twelveMonths).toFixed(2)).toBe("1050000.00");
  });

  it("prorates naturally for partial years", () => {
    const sixMonths = Array.from({ length: 6 }, () => new Decimal(920000));
    expect(calculateAguinaldo(sixMonths).toFixed(2)).toBe("460000.00");
  });

  it("rounds the twelfth to céntimos", () => {
    expect(calculateAguinaldo([new Decimal(100)]).toFixed(2)).toBe("8.33");
  });
});
