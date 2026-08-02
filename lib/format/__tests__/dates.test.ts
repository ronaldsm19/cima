import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  daysInMonth,
  formatDateCR,
  fullMonthsBetween,
  isoDayOfWeek,
  parseDateCR,
} from "../dates";

describe("ISO date helpers (timezone-proof)", () => {
  it("formats and parses dd/MM/yyyy", () => {
    expect(formatDateCR("2026-08-19")).toBe("19/08/2026");
    expect(parseDateCR("19/08/2026")).toBe("2026-08-19");
  });

  it("knows weekdays without local-timezone drift", () => {
    expect(isoDayOfWeek("2026-08-01")).toBe(6); // Saturday (prototype calendar)
    expect(isoDayOfWeek("2026-08-10")).toBe(1); // Monday
    expect(isoDayOfWeek("2026-09-15")).toBe(2); // Tuesday — Independencia
  });

  it("adds days across month boundaries", () => {
    expect(addDaysIso("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("computes month lengths (leap year aware)", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 7)).toBe(31);
  });

  it("counts full months for antigüedad and accrual", () => {
    expect(fullMonthsBetween("2019-03-12", "2026-08-02")).toBe(88);
    expect(fullMonthsBetween("2026-01-31", "2026-02-28")).toBe(0);
    expect(fullMonthsBetween("2026-01-15", "2026-02-15")).toBe(1);
  });
});
