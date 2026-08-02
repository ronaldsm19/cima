import type { PayrollPeriod } from "@prisma/client";
import { daysInMonth, todayCR } from "@/lib/format/dates";

/**
 * Quincenal cut helpers. Quincena 1 = day 1–15; quincena 2 = 16–last day of
 * the month. Pay date = period end date (the office pays at the close).
 */

export interface PeriodKey {
  year: number;
  month: number; // 1-12
  numero: 1 | 2;
}

export interface PeriodDates extends PeriodKey {
  startDate: string;
  endDate: string;
  payDate: string;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

export function periodDates(key: PeriodKey): PeriodDates {
  const mm = String(key.month).padStart(2, "0");
  const last = daysInMonth(key.year, key.month);
  const startDate = key.numero === 1 ? `${key.year}-${mm}-01` : `${key.year}-${mm}-16`;
  const endDate = key.numero === 1 ? `${key.year}-${mm}-15` : `${key.year}-${mm}-${String(last).padStart(2, "0")}`;
  return { ...key, startDate, endDate, payDate: endDate };
}

/** The quincena that contains today (America/Costa_Rica). */
export function currentPeriodKey(todayIso: string = todayCR()): PeriodKey {
  const [y, m, d] = todayIso.split("-").map(Number);
  return { year: y, month: m, numero: d <= 15 ? 1 : 2 };
}

/** "Quincena 2 · 16–31 jul 2026" — the header selector label. */
export function periodLabel(p: Pick<PayrollPeriod, "year" | "month" | "numero" | "startDate" | "endDate">): string {
  const d1 = Number(p.startDate.slice(8, 10));
  const d2 = Number(p.endDate.slice(8, 10));
  return `Quincena ${p.numero} · ${String(d1).padStart(2, "0")}–${String(d2).padStart(2, "0")} ${MESES_CORTOS[p.month - 1]} ${p.year}`;
}

/** URL value for ?periodo= — "2026-07-2". */
export function periodSlug(key: { year: number; month: number; numero: number }): string {
  return `${key.year}-${String(key.month).padStart(2, "0")}-${key.numero}`;
}

export function parsePeriodSlug(slug: string | undefined): PeriodKey | null {
  if (!slug) return null;
  const m = /^(\d{4})-(\d{2})-([12])$/.exec(slug);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(m[1]), month, numero: Number(m[3]) as 1 | 2 };
}
