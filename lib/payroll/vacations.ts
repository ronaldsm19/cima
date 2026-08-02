import { addDaysIso, compareIso, fullMonthsBetween, isoDayOfWeek } from "@/lib/format/dates";
import { Decimal } from "./rounding";

/**
 * Vacation math — pure, on ISO date strings (never local Date objects).
 * Días hábiles exclude Saturdays, Sundays and feriados de ley.
 */

export function businessDaysInRange(
  startIso: string,
  endIso: string,
  holidays: ReadonlySet<string> | readonly string[],
): number {
  const holidaySet = holidays instanceof Set ? holidays : new Set(holidays);
  let [from, to] = [startIso, endIso];
  if (compareIso(to, from) < 0) [from, to] = [to, from];

  let days = 0;
  for (let d = from; compareIso(d, to) <= 0; d = addDaysIso(d, 1)) {
    const dow = isoDayOfWeek(d);
    if (dow === 0 || dow === 6) continue;
    if (holidaySet.has(d)) continue;
    days += 1;
  }
  return days;
}

/** Holidays inside the range that fall on a weekday (shown in "Feriados dentro"). */
export function holidaysInRange(
  startIso: string,
  endIso: string,
  holidays: readonly string[],
): string[] {
  let [from, to] = [startIso, endIso];
  if (compareIso(to, from) < 0) [from, to] = [to, from];
  return holidays
    .filter((h) => compareIso(h, from) >= 0 && compareIso(h, to) <= 0)
    .filter((h) => isoDayOfWeek(h) !== 0 && isoDayOfWeek(h) !== 6)
    .sort();
}

/**
 * Accrued vacation days from hire date to a given date.
 * Default 1 day per completed month ≈ Código de Trabajo art. 153 (two weeks per
 * 50 worked weeks), parameterized in case the office is more generous.
 */
export function accruedDays(
  hireDateIso: string,
  asOfIso: string,
  diasPorMes: Decimal,
): Decimal {
  return diasPorMes.mul(fullMonthsBetween(hireDateIso, asOfIso));
}

/** Exact README message when the requested range exceeds the balance. */
export function vacationExcessMessage(
  requestedDays: number,
  balance: number,
  employeeName: string,
): string {
  const excess = requestedDays - balance;
  return `El rango pide ${requestedDays} días hábiles y ${employeeName} tiene ${formatDays(balance)}. Recortá ${formatDays(excess)} días o pasá el resto a adelanto de vacaciones.`;
}

/** 8 → "8", 8.5 → "8,5" (Spanish decimal comma, no trailing zeros). */
export function formatDays(days: number): string {
  return String(days).replace(".", ",");
}
