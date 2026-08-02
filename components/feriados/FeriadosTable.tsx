"use client";

import { AlertTriangle, CopyPlus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pill } from "@/components/ds/Pill";
import {
  createHoliday,
  deleteHoliday,
  duplicateYear,
  updateHoliday,
} from "@/lib/actions/feriados";
import { formatDateCR, todayCR } from "@/lib/format/dates";

export interface FeriadoRow {
  id: string;
  date: string;
  name: string;
  pagoObligatorio: boolean;
  esTrasladable: boolean;
  recurrenteAnual: boolean;
}

export function FeriadosTable({
  feriados,
  year,
  years,
  canCrud,
}: {
  feriados: FeriadoRow[];
  year: number;
  years: number[];
  canCrud: boolean;
}) {
  const router = useRouter();
  const [nuevo, setNuevo] = useState({ date: "", name: "", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: true });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const agregar = () => {
    setError(null);
    startTransition(async () => {
      const res = await createHoliday(nuevo);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`${nuevo.name} quedó registrado.`);
      setNuevo({ date: "", name: "", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: true });
      router.refresh();
    });
  };

  const borrar = (f: FeriadoRow) => {
    if (!window.confirm(`¿Eliminar ${f.name} (${formatDateCR(f.date)})? Los días hábiles de vacaciones ya registrados no se recalculan.`)) return;
    startTransition(async () => {
      const res = await deleteHoliday(f.id);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`${f.name} eliminado.`);
        router.refresh();
      }
    });
  };

  const toggle = (f: FeriadoRow, patch: Partial<FeriadoRow>) => {
    startTransition(async () => {
      const res = await updateHoliday(f.id, { ...f, ...patch });
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  };

  const duplicar = () => {
    startTransition(async () => {
      const res = await duplicateYear(year);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if ("copied" in res) {
        toast.success(
          `${res.copied} feriados copiados a ${year + 1}.` +
            (res.skipped.length > 0
              ? ` Pendientes a mano (fecha móvil): ${res.skipped.join(", ")}.`
              : ""),
        );
      }
      router.push(`/feriados?year=${year + 1}`);
      router.refresh();
    });
  };

  const field =
    "field-focus h-[34px] rounded-[10px] border border-control-border bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-faint";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-[34px] items-center gap-2 rounded-[10px] border border-line bg-app px-3 text-[13px] font-semibold text-ink">
          <span className="text-[12px] font-semibold text-ink-dim">Año</span>
          <select
            value={year}
            onChange={(e) => router.push(`/feriados?year=${e.target.value}`)}
            className="cursor-pointer border-none bg-transparent outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <span className="text-[12.5px] text-ink-dim">
          {feriados.length} feriado{feriados.length !== 1 ? "s" : ""} · los de pago obligatorio se
          excluyen del conteo de días hábiles
        </span>
        {canCrud ? (
          <button
            type="button"
            disabled={pending || feriados.length === 0}
            onClick={duplicar}
            className="ml-auto flex h-[34px] items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3 text-[12.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            <CopyPlus size={14} strokeWidth={2} aria-hidden /> Duplicar al {year + 1}
          </button>
        ) : null}
      </div>

      {/* Tabla */}
      <div className="overflow-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="bg-surface-subtle">
            <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
              <th className="px-4 text-left">Fecha</th>
              <th className="px-2 text-left">Feriado</th>
              <th className="px-2 text-left">Pago</th>
              <th className="px-2 text-left">Trasladable</th>
              <th className="px-2 text-left">Recurrente</th>
              {canCrud ? <th className="w-[60px] px-4" /> : null}
            </tr>
          </thead>
          <tbody>
            {feriados.map((f) => (
              <tr key={f.id} className="h-[46px] border-b border-line-row text-[13px] hover:bg-row-hover">
                <td className="num px-4 text-[12.5px]">{formatDateCR(f.date)}</td>
                <td className="px-2 text-[13.5px] font-semibold text-ink">{f.name}</td>
                <td className="px-2">
                  {canCrud ? (
                    <button type="button" onClick={() => toggle(f, { pagoObligatorio: !f.pagoObligatorio })} title="Cambiar">
                      <Pill tone={f.pagoObligatorio ? "pagado" : "neutro"}>
                        {f.pagoObligatorio ? "obligatorio" : "no obligatorio"}
                      </Pill>
                    </button>
                  ) : (
                    <Pill tone={f.pagoObligatorio ? "pagado" : "neutro"}>
                      {f.pagoObligatorio ? "obligatorio" : "no obligatorio"}
                    </Pill>
                  )}
                </td>
                <td className="px-2">
                  {canCrud ? (
                    <button type="button" onClick={() => toggle(f, { esTrasladable: !f.esTrasladable })} title="Cambiar">
                      <Pill tone={f.esTrasladable ? "pendiente" : "neutro"}>
                        {f.esTrasladable ? "a lunes" : "fijo"}
                      </Pill>
                    </button>
                  ) : (
                    <Pill tone={f.esTrasladable ? "pendiente" : "neutro"}>
                      {f.esTrasladable ? "a lunes" : "fijo"}
                    </Pill>
                  )}
                </td>
                <td className="px-2 text-[12.5px] text-ink-mid">
                  {f.recurrenteAnual ? "todos los años" : "fecha móvil"}
                </td>
                {canCrud ? (
                  <td className="px-4 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => borrar(f)}
                      className="text-ink-faint transition-colors duration-[140ms] hover:text-bad-text"
                      aria-label={`Eliminar ${f.name}`}
                    >
                      <Trash2 size={15} strokeWidth={1.8} aria-hidden />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {feriados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[12.5px] text-ink-mid">
                  No hay feriados registrados en {year}. Usá &quot;Duplicar&quot; desde el año
                  anterior o agregalos abajo.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Alta */}
      {canCrud ? (
        <div className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <div className="mb-2 text-[13.5px] font-bold text-ink">Agregar feriado</div>
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink-dim" htmlFor="fer-fecha">Fecha</label>
              <input id="fer-fecha" type="date" className={`num ${field}`} value={nuevo.date}
                onChange={(e) => { setNuevo((n) => ({ ...n, date: e.target.value })); setError(null); }} />
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-[11.5px] font-semibold text-ink-dim" htmlFor="fer-nombre">Nombre</label>
              <input id="fer-nombre" className={`${field} w-full`} placeholder="Jueves Santo"
                value={nuevo.name}
                onChange={(e) => { setNuevo((n) => ({ ...n, name: e.target.value })); setError(null); }} />
            </div>
            <label className="flex h-[34px] items-center gap-1.5 text-[12.5px] text-ink">
              <input type="checkbox" className="size-4 accent-[#0E6B4E]" checked={nuevo.pagoObligatorio}
                onChange={(e) => setNuevo((n) => ({ ...n, pagoObligatorio: e.target.checked }))} />
              Pago obligatorio
            </label>
            <label className="flex h-[34px] items-center gap-1.5 text-[12.5px] text-ink">
              <input type="checkbox" className="size-4 accent-[#0E6B4E]" checked={nuevo.esTrasladable}
                onChange={(e) => setNuevo((n) => ({ ...n, esTrasladable: e.target.checked }))} />
              Se traslada a lunes
            </label>
            <label className="flex h-[34px] items-center gap-1.5 text-[12.5px] text-ink">
              <input type="checkbox" className="size-4 accent-[#0E6B4E]" checked={nuevo.recurrenteAnual}
                onChange={(e) => setNuevo((n) => ({ ...n, recurrenteAnual: e.target.checked }))} />
              Todos los años
            </label>
            <button
              type="button"
              disabled={pending || !nuevo.date || !nuevo.name}
              onClick={agregar}
              className="flex h-[34px] items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
            >
              <Plus size={14} strokeWidth={2.2} aria-hidden /> Agregar
            </button>
          </div>
          {error ? (
            <div className="mt-2 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2 text-[12.5px] text-[#8E3323]">
              <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Semana Santa cambia de fecha cada año: registrala a mano (sin &quot;todos los
            años&quot;). Hoy es {formatDateCR(todayCR())}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
