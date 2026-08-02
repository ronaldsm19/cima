import { TZDate } from "@date-fns/tz";

/**
 * Business dates travel the whole app as ISO `yyyy-MM-dd` strings — never as
 * Date objects (a Date at UTC midnight renders as the previous day at UTC−6).
 * "Today" and period boundaries are always resolved in America/Costa_Rica.
 */

export const CR_TIME_ZONE = "America/Costa_Rica";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string): void {
  if (!ISO_DATE.test(value)) {
    throw new Error(`Expected yyyy-MM-dd date, got: ${value}`);
  }
}

/** Today's date in Costa Rica as yyyy-MM-dd. */
export function todayCR(): string {
  const now = TZDate.tz(CR_TIME_ZONE);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** yyyy-MM-dd → dd/MM/yyyy (display format everywhere in the UI). */
export function formatDateCR(iso: string): string {
  assertIsoDate(iso);
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** dd/MM/yyyy → yyyy-MM-dd (parsing user input). */
export function parseDateCR(display: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!match) throw new Error(`Fecha inválida: ${display}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Calendar math on ISO strings without timezone traps: build a UTC Date only as
 * an intermediate, never exposing it.
 */
export function isoToUtc(iso: string): Date {
  assertIsoDate(iso);
  return new Date(`${iso}T00:00:00Z`);
}

export function utcToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Day of week for an ISO date: 0 = Sunday … 6 = Saturday. */
export function isoDayOfWeek(iso: string): number {
  return isoToUtc(iso).getUTCDay();
}

export function addDaysIso(iso: string, days: number): string {
  const d = isoToUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToIso(d);
}

export function daysInMonth(year: number, month: number): number {
  // month 1-12; day 0 of next month = last day of this month
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Whole months elapsed between two ISO dates (for vacation accrual / antigüedad). */
export function fullMonthsBetween(fromIso: string, toIso: string): number {
  assertIsoDate(fromIso);
  assertIsoDate(toIso);
  if (toIso < fromIso) return 0;
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
}
