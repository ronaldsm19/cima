"use client";

import { AlertTriangle, CalendarCog, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ajustarSaldoVacaciones, registrarVacaciones } from "@/lib/actions/vacaciones";
import { daysInMonth, formatDateCR, isoDayOfWeek } from "@/lib/format/dates";
import {
  businessDaysInRange,
  formatDays,
  holidaysInRange,
  vacationExcessMessage,
} from "@/lib/payroll/vacations";
import type { VacacionesDTO } from "@/lib/vacaciones/data";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];
const DOW = ["L", "K", "M", "J", "V", "S", "D"];

export function VacationCalendar({
  data,
  initialEmployeeId,
}: {
  data: VacacionesDTO;
  initialEmployeeId?: string;
}) {
  const router = useRouter();
  const [empId, setEmpId] = useState(
    initialEmployeeId && data.empleados.some((e) => e.id === initialEmployeeId)
      ? initialEmployeeId
      : (data.empleados[0]?.id ?? ""),
  );
  const [ini, setIni] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [ajusteModal, setAjusteModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const empleado = data.empleados.find((e) => e.id === empId) ?? null;
  const feriadoSet = useMemo(() => new Set(data.feriados.map((f) => f.date)), [data.feriados]);

  // Range click semantics (README): 1st click start · 2nd click end (inverted
  // if earlier) · 3rd click starts over
  const onDayClick = (iso: string) => {
    if (!ini || (ini && fin)) {
      setIni(iso);
      setFin(null);
    } else {
      if (iso < ini) {
        setFin(ini);
        setIni(iso);
      } else {
        setFin(iso);
      }
    }
  };

  const [rangoIni, rangoFin] = ini && fin ? [ini, fin] : [ini, ini];
  const diasHabiles =
    ini && fin ? businessDaysInRange(ini, fin, feriadoSet) : null;
  const feriadosDentro =
    ini && fin ? holidaysInRange(ini, fin, data.feriados.map((f) => f.date)).length : 0;
  const excede =
    diasHabiles !== null && empleado !== null && diasHabiles > empleado.saldo;

  const registrar = () => {
    if (!empleado || !ini || !fin || diasHabiles === null) return;
    startTransition(async () => {
      const res = await registrarVacaciones({ employeeId: empleado.id, startDate: ini, endDate: fin });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(
          `${formatDays(diasHabiles)} días de ${empleado.nombre.split(" ")[0]} quedaron registrados.`,
        );
        setIni(null);
        setFin(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1fr_350px] items-start gap-4 max-[960px]:grid-cols-1">
      {/* ── Calendario ── */}
      <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <header className="flex h-[54px] items-center gap-3 border-b border-line-soft px-4">
          <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">Selección de rango</h2>
          <span className="text-[12.5px] text-ink-dim">
            Clic en el día de inicio y luego en el del regreso
          </span>
          <div className="ml-auto flex items-center gap-2">
            {data.permisos.feriados ? (
              <Link
                href="/feriados"
                className="flex h-[30px] items-center gap-1.5 rounded-lg border border-control-border px-2.5 text-[12px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
              >
                <CalendarCog size={13} strokeWidth={2} aria-hidden /> Feriados
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setIni(null);
                setFin(null);
              }}
              className="h-[30px] rounded-lg border border-control-border px-2.5 text-[12px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
            >
              Limpiar
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 divide-x divide-line-soft max-[960px]:grid-cols-1">
          {data.meses.map((mes) => (
            <MonthGrid
              key={`${mes.year}-${mes.month}`}
              year={mes.year}
              month={mes.month}
              feriados={feriadoSet}
              rangoIni={rangoIni}
              rangoFin={rangoFin}
              onDayClick={onDayClick}
            />
          ))}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-5 border-t border-line-soft px-5 py-3 text-[11.5px] text-ink-mid">
          <span className="flex items-center gap-1.5">
            <span className="size-4 rounded-[5px] bg-[#F1F3EF]" aria-hidden /> Fin de semana
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-4 rounded-[5px] bg-warn-tint" aria-hidden /> Feriado de ley
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-4 rounded-[5px] bg-brand-tint-mid" aria-hidden /> Rango seleccionado
          </span>
        </div>
      </section>

      {/* ── Panel derecho ── */}
      <div className="flex flex-col gap-4">
        {/* Empleado */}
        <section className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <h3 className="mb-2 text-[14.5px] font-bold tracking-[-0.01em] text-ink">Empleado</h3>
          <select
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="field-focus h-[38px] w-full rounded-[10px] border border-control-border bg-surface px-3 text-[13.5px] text-ink"
            aria-label="Empleado"
          >
            {data.empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} · {e.puesto}
              </option>
            ))}
          </select>
          {empleado ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <BalanceBox label="Acumulado" value={formatDays(empleado.acumulado)} />
              <BalanceBox label="Tomados" value={formatDays(empleado.tomados)} />
              <BalanceBox label="Saldo" value={formatDays(empleado.saldo)} highlight />
            </div>
          ) : null}
          {data.permisos.ajustar && empleado ? (
            <button
              type="button"
              onClick={() => setAjusteModal(true)}
              className="mt-2.5 text-[12px] font-semibold text-brand hover:underline"
            >
              Ajustar saldo manualmente
            </button>
          ) : null}
        </section>

        {/* Rango solicitado */}
        <section className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <h3 className="mb-1 text-[14.5px] font-bold tracking-[-0.01em] text-ink">Rango solicitado</h3>
          <PanelRow label="Del" value={ini ? formatDateCR(ini) : "—"} />
          <PanelRow label="Al" value={fin ? formatDateCR(fin) : "—"} />
          <PanelRow
            label="Feriados dentro"
            value={ini && fin ? String(feriadosDentro) : "—"}
            tone={feriadosDentro > 0 ? "warn" : undefined}
          />

          <div className="mt-3 flex items-center justify-between rounded-xl border border-brand-tint-border bg-brand-tint-soft px-4 py-3">
            <span className="text-[13px] font-semibold text-ink">Días hábiles</span>
            <span className="num text-[20px] font-bold text-brand">
              {diasHabiles !== null ? formatDays(diasHabiles) : "—"}
            </span>
          </div>

          {excede && empleado && diasHabiles !== null ? (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2.5 text-[12.5px] text-[#8E3323]">
              <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
              <span>{vacationExcessMessage(diasHabiles, empleado.saldo, empleado.nombre)}</span>
            </div>
          ) : null}

          {data.permisos.registrar ? (
            <button
              type="button"
              disabled={!ini || !fin || diasHabiles === 0 || excede || pending}
              onClick={registrar}
              className="mt-3 h-[38px] w-full rounded-[10px] bg-brand text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
            >
              {pending ? "Registrando…" : "Registrar vacaciones"}
            </button>
          ) : null}
        </section>
      </div>

      {ajusteModal && empleado ? (
        <AjusteModal
          empleado={empleado}
          onClose={() => setAjusteModal(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

// ── Mes ──────────────────────────────────────────────────────────────────────

function MonthGrid({
  year,
  month,
  feriados,
  rangoIni,
  rangoFin,
  onDayClick,
}: {
  year: number;
  month: number;
  feriados: ReadonlySet<string>;
  rangoIni: string | null;
  rangoFin: string | null;
  onDayClick: (iso: string) => void;
}) {
  const total = daysInMonth(year, month);
  const mm = String(month).padStart(2, "0");
  const firstIso = `${year}-${mm}-01`;
  // Monday-first offset (isoDayOfWeek: 0=Sunday … 6=Saturday)
  const offset = (isoDayOfWeek(firstIso) + 6) % 7;

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => `${year}-${mm}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <div className="px-5 py-[18px]">
      <div className="mb-2.5 text-[13.5px] font-bold text-ink">
        {MESES[month - 1]} {year}
      </div>
      <div className="grid grid-cols-7 gap-[3px]">
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] font-semibold text-ink-faint">
            {d}
          </div>
        ))}
        {cells.map((iso, i) =>
          iso === null ? (
            <div key={`blank-${i}`} />
          ) : (
            <DayCell
              key={iso}
              iso={iso}
              feriado={feriados.has(iso)}
              inRange={
                rangoIni !== null && rangoFin !== null && iso >= rangoIni && iso <= rangoFin
              }
              endpoint={iso === rangoIni || iso === rangoFin}
              onClick={() => onDayClick(iso)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function DayCell({
  iso,
  feriado,
  inRange,
  endpoint,
  onClick,
}: {
  iso: string;
  feriado: boolean;
  inRange: boolean;
  endpoint: boolean;
  onClick: () => void;
}) {
  const dow = isoDayOfWeek(iso);
  const weekend = dow === 0 || dow === 6;
  const day = Number(iso.slice(8, 10));

  let cls = "bg-surface text-ink";
  if (weekend) cls = "bg-[#F1F3EF] text-ink-faint";
  if (feriado) cls = "bg-warn-tint font-semibold text-warn-text";
  if (inRange) cls = "bg-brand-tint-mid font-semibold text-brand";
  if (endpoint) cls = "bg-brand font-bold text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`num h-9 rounded-[9px] text-[12.5px] transition-colors duration-[140ms] hover:ring-1 hover:ring-brand/40 ${cls}`}
      aria-label={formatDateCR(iso)}
      aria-pressed={inRange || endpoint}
    >
      {day}
    </button>
  );
}

// ── Cajas y filas del panel ──────────────────────────────────────────────────

function BalanceBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[10px] px-3 py-2.5 ${highlight ? "bg-brand-tint" : "bg-row-hover"}`}>
      <div className="text-[11px] font-semibold text-ink-dim">{label}</div>
      <div className={`num mt-0.5 text-[15px] font-bold ${highlight ? "text-brand" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function PanelRow({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-hair py-2 last:border-b-0">
      <span className="text-[12.5px] text-ink-mid">{label}</span>
      <span className={`num text-[13px] ${tone === "warn" ? "font-semibold text-warn-text" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Ajuste manual ────────────────────────────────────────────────────────────

function AjusteModal({
  empleado,
  onClose,
  onSaved,
}: {
  empleado: { id: string; nombre: string; saldo: number };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const n = Number(days.replace(",", "."));
    if (!Number.isFinite(n) || n === 0) {
      setError("Indicá los días del ajuste (positivos suman, negativos restan).");
      return;
    }
    startTransition(async () => {
      const res = await ajustarSaldoVacaciones({ employeeId: empleado.id, days: n, reason });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`Saldo de ${empleado.nombre.split(" ")[0]} ajustado.`);
      onSaved();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,30,25,0.42)] p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar saldo de vacaciones"
    >
      <div
        className="w-full max-w-[440px] rounded-2xl bg-surface p-5 shadow-[0_32px_70px_-24px_rgba(9,20,15,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold tracking-[-0.01em] text-ink">Ajustar saldo</h2>
            <p className="text-[12.5px] text-ink-mid">
              {empleado.nombre} · saldo actual {formatDays(empleado.saldo)} días. Queda en la bitácora.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 flex-none items-center justify-center rounded-lg border border-control-border text-ink-mid hover:bg-app"
            aria-label="Cerrar"
          >
            <X size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <label className="mb-1.5 block text-[12px] font-semibold text-ink-mid" htmlFor="aj-dias">
          Días (± con decimales, p. ej. -2 o 1,5)
        </label>
        <input
          id="aj-dias"
          inputMode="decimal"
          autoFocus
          className="field-focus num h-[38px] w-full rounded-[10px] border border-control-border bg-surface px-3 text-right text-[13.5px]"
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            setError(null);
          }}
        />
        <label className="mb-1.5 mt-3 block text-[12px] font-semibold text-ink-mid" htmlFor="aj-motivo">
          Motivo (obligatorio)
        </label>
        <textarea
          id="aj-motivo"
          rows={2}
          className="field-focus w-full rounded-[10px] border border-control-border bg-surface px-3 py-2 text-[13.5px]"
          placeholder="Acuerdo con el dueño, corrección del control anterior…"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
        />

        {error ? (
          <div className="mt-2 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2 text-[12.5px] text-[#8E3323]">
            <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] rounded-[10px] border border-control-border bg-surface px-4 text-[13.5px] font-semibold text-[#2C3A33] hover:bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="h-[38px] rounded-[10px] bg-brand px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
          >
            {pending ? "Guardando…" : "Guardar ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
}
