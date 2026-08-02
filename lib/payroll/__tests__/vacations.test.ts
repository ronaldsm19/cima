import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  accruedDays,
  businessDaysInRange,
  formatDays,
  holidaysInRange,
  vacationExcessMessage,
} from "../vacations";

// 2026: 15/08 falls on Saturday; 15/09 (Independencia) on Tuesday.
const HOLIDAYS_2026 = ["2026-08-15", "2026-09-15"];

describe("businessDaysInRange", () => {
  it("matches the prototype case: 10–19 ago 2026 → 8 días hábiles", () => {
    // Weekdays: 10-14 (5) + 17-19 (3); the 15/08 feriado falls on Saturday.
    expect(businessDaysInRange("2026-08-10", "2026-08-19", HOLIDAYS_2026)).toBe(8);
  });

  it("excludes weekday holidays from the count", () => {
    // 14–18 sep: 5 weekdays − feriado 15/09 (Tuesday) = 4
    expect(businessDaysInRange("2026-09-14", "2026-09-18", HOLIDAYS_2026)).toBe(4);
  });

  it("counts a single weekday as 1 and a weekend day as 0", () => {
    expect(businessDaysInRange("2026-08-10", "2026-08-10", HOLIDAYS_2026)).toBe(1);
    expect(businessDaysInRange("2026-08-16", "2026-08-16", HOLIDAYS_2026)).toBe(0);
  });

  it("inverts a backwards range instead of failing", () => {
    expect(businessDaysInRange("2026-08-19", "2026-08-10", HOLIDAYS_2026)).toBe(8);
  });
});

describe("holidaysInRange", () => {
  it("only reports weekday holidays inside the range", () => {
    expect(holidaysInRange("2026-08-01", "2026-09-30", HOLIDAYS_2026)).toEqual([
      "2026-09-15",
    ]);
    expect(holidaysInRange("2026-08-01", "2026-08-31", HOLIDAYS_2026)).toEqual([]);
  });
});

describe("accruedDays", () => {
  it("accrues one day per completed month by default", () => {
    expect(accruedDays("2025-08-15", "2026-08-14", new Decimal(1)).toNumber()).toBe(11);
    expect(accruedDays("2025-08-15", "2026-08-15", new Decimal(1)).toNumber()).toBe(12);
  });

  it("supports a more generous parametrized rate", () => {
    expect(accruedDays("2026-01-01", "2026-07-01", new Decimal("1.25")).toNumber()).toBe(7.5);
  });

  it("never goes negative", () => {
    expect(accruedDays("2026-08-15", "2026-01-01", new Decimal(1)).toNumber()).toBe(0);
  });
});

describe("vacationExcessMessage", () => {
  it("produces the exact README message", () => {
    expect(vacationExcessMessage(10, 8.5, "Esteban Zúñiga Brenes")).toBe(
      "El rango pide 10 días hábiles y Esteban Zúñiga Brenes tiene 8,5. Recortá 1,5 días o pasá el resto a adelanto de vacaciones.",
    );
  });
});

describe("formatDays", () => {
  it("uses decimal comma and drops trailing zeros", () => {
    expect(formatDays(8)).toBe("8");
    expect(formatDays(8.5)).toBe("8,5");
  });
});
