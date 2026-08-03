"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pill } from "@/components/ds/Pill";
import { createParameterSet, type ParamSetValues } from "@/lib/actions/configuracion";
import { formatCRC0 } from "@/lib/format/currency";
import { formatDateCR } from "@/lib/format/dates";

export interface ParamSetRow {
  id: string;
  label: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  tasaSem: number;
  tasaIvm: number;
  tasaBp: number;
  tasaPatronal: number;
  horasMensuales: number;
  horaExtraFactor: number;
  vacacionesDiasPorMes: number;
  brackets: { limiteInferior: string; limiteSuperior: string | null; tasaPct: number }[];
  periodosUsando: number;
}

/** Versioned legal parameters: existing sets are read-only, new ones are added. */
export function ParametrosPanel({ sets, vigente }: { sets: ParamSetRow[]; vigente: ParamSetRow | null }) {
  const router = useRouter();
  const [form, setForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const base = vigente ?? sets[0];
  const [values, setValues] = useState<ParamSetValues>(() => ({
    label: `Parámetros ${new Date().getFullYear() + 1}`,
    vigenteDesde: `${new Date().getFullYear() + 1}-01-01`,
    vigenteHasta: null,
    tasaSem: base?.tasaSem ?? 5.5,
    tasaIvm: base?.tasaIvm ?? 4.17,
    tasaBp: base?.tasaBp ?? 1,
    tasaPatronal: base?.tasaPatronal ?? 26.83,
    horaExtraFactor: base?.horaExtraFactor ?? 1.5,
    horasMensuales: base?.horasMensuales ?? 240,
    factorSemanalAMensual: 4.333,
    creditoFiscalHijoMensual: "0",
    creditoFiscalConyugeMensual: "0",
    vacacionesDiasPorMes: base?.vacacionesDiasPorMes ?? 1,
    isrBrackets: base?.brackets ?? [
      { limiteInferior: "0", limiteSuperior: "942000", tasaPct: 0 },
    ],
  }));

  const ccssTotal = (values.tasaSem + values.tasaIvm + values.tasaBp).toFixed(2).replace(".", ",");

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      const res = await createParameterSet(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`${values.label} quedó registrado. Los períodos viejos no se tocan.`);
      setForm(false);
      router.refresh();
    });
  };

  const setBracket = (i: number, patch: Partial<ParamSetValues["isrBrackets"][number]>) => {
    setValues((v) => ({
      ...v,
      isrBrackets: v.isrBrackets.map((b, j) => (j === i ? { ...b, ...patch } : b)),
    }));
  };

  const field =
    "field-focus h-[34px] w-full rounded-[10px] border border-control-border bg-surface px-2.5 text-[13px] text-ink";
  const label = "mb-1 block text-[11.5px] font-semibold text-ink-dim";

  return (
    <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <div>
          <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">
            Parámetros de planilla
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-mid">
            La tasa de CCSS y los tramos de renta cambian por ley cada año. Se agrega un juego
            nuevo con su fecha de vigencia; los períodos ya aprobados conservan el suyo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm((f) => !f)}
          className="flex h-[34px] flex-none items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover"
        >
          <Plus size={14} strokeWidth={2.2} aria-hidden /> {form ? "Cancelar" : "Nuevo período fiscal"}
        </button>
      </header>

      {/* Juegos existentes */}
      <div className="divide-y divide-line-soft">
        {sets.map((s) => (
          <div key={s.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13.5px] font-semibold text-ink">{s.label}</span>
              {s.vigenteHasta === null ? <Pill tone="pagado">vigente</Pill> : <Pill tone="neutro">cerrado</Pill>}
              <span className="num text-[12px] text-ink-dim">
                desde {formatDateCR(s.vigenteDesde)}
                {s.vigenteHasta ? ` hasta ${formatDateCR(s.vigenteHasta)}` : ""}
              </span>
              {s.periodosUsando > 0 ? (
                <span className="text-[11.5px] text-ink-faint">
                  · {s.periodosUsando} período{s.periodosUsando !== 1 ? "s" : ""} lo usa
                </span>
              ) : null}
            </div>
            <div className="num mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-ink-mid">
              <span>
                CCSS {(s.tasaSem + s.tasaIvm + s.tasaBp).toFixed(2).replace(".", ",")} % (SEM{" "}
                {String(s.tasaSem).replace(".", ",")} · IVM {String(s.tasaIvm).replace(".", ",")} · BP{" "}
                {String(s.tasaBp).replace(".", ",")})
              </span>
              <span>Patronales {String(s.tasaPatronal).replace(".", ",")} %</span>
              <span>Hora extra ×{String(s.horaExtraFactor).replace(".", ",")} sobre {s.horasMensuales} h</span>
              <span>Vacaciones {String(s.vacacionesDiasPorMes).replace(".", ",")} día/mes</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {s.brackets.map((b, i) => (
                <span
                  key={i}
                  className="num rounded-md bg-app px-2 py-0.5 text-[11px] text-ink-mid"
                >
                  {b.limiteSuperior
                    ? `${formatCRC0(b.limiteInferior)}–${formatCRC0(b.limiteSuperior)}`
                    : `más de ${formatCRC0(b.limiteInferior)}`}{" "}
                  → {String(b.tasaPct).replace(".", ",")} %
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Alta */}
      {form ? (
        <div className="border-t border-line-soft bg-app/40 p-4">
          <div className="grid grid-cols-4 gap-2.5 max-[960px]:grid-cols-2">
            <div className="col-span-2">
              <label className={label} htmlFor="ps-label">Etiqueta</label>
              <input id="ps-label" className={field} value={values.label}
                onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-desde">Vigente desde</label>
              <input id="ps-desde" type="date" className={`num ${field}`} value={values.vigenteDesde}
                onChange={(e) => setValues((v) => ({ ...v, vigenteDesde: e.target.value }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-vac">Vacaciones (días por mes)</label>
              <input id="ps-vac" inputMode="decimal" className={`num text-right ${field}`}
                value={values.vacacionesDiasPorMes}
                onChange={(e) => setValues((v) => ({ ...v, vacacionesDiasPorMes: Number(e.target.value.replace(",", ".")) || 0 }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-sem">CCSS · SEM (%)</label>
              <input id="ps-sem" inputMode="decimal" className={`num text-right ${field}`} value={values.tasaSem}
                onChange={(e) => setValues((v) => ({ ...v, tasaSem: Number(e.target.value.replace(",", ".")) || 0 }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-ivm">CCSS · IVM (%)</label>
              <input id="ps-ivm" inputMode="decimal" className={`num text-right ${field}`} value={values.tasaIvm}
                onChange={(e) => setValues((v) => ({ ...v, tasaIvm: Number(e.target.value.replace(",", ".")) || 0 }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-bp">Banco Popular (%)</label>
              <input id="ps-bp" inputMode="decimal" className={`num text-right ${field}`} value={values.tasaBp}
                onChange={(e) => setValues((v) => ({ ...v, tasaBp: Number(e.target.value.replace(",", ".")) || 0 }))} />
            </div>
            <div className="flex items-end">
              <div className="num flex h-[34px] w-full items-center justify-center rounded-[10px] bg-brand-tint text-[13px] font-bold text-brand">
                Total {ccssTotal} %
              </div>
            </div>
            <div>
              <label className={label} htmlFor="ps-patronal">Cargas patronales (%)</label>
              <input id="ps-patronal" inputMode="decimal" className={`num text-right ${field}`} value={values.tasaPatronal}
                onChange={(e) => setValues((v) => ({ ...v, tasaPatronal: Number(e.target.value.replace(",", ".")) || 0 }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-hef">Factor de hora extra</label>
              <input id="ps-hef" inputMode="decimal" className={`num text-right ${field}`} value={values.horaExtraFactor}
                onChange={(e) => setValues((v) => ({ ...v, horaExtraFactor: Number(e.target.value.replace(",", ".")) || 0 }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-hm">Horas mensuales</label>
              <input id="ps-hm" inputMode="numeric" className={`num text-right ${field}`} value={values.horasMensuales}
                onChange={(e) => setValues((v) => ({ ...v, horasMensuales: Number(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-hijo">Crédito por hijo (₡/mes)</label>
              <input id="ps-hijo" inputMode="decimal" className={`num text-right ${field}`}
                value={values.creditoFiscalHijoMensual}
                onChange={(e) => setValues((v) => ({ ...v, creditoFiscalHijoMensual: e.target.value }))} />
            </div>
            <div>
              <label className={label} htmlFor="ps-conyuge">Crédito por cónyuge (₡/mes)</label>
              <input id="ps-conyuge" inputMode="decimal" className={`num text-right ${field}`}
                value={values.creditoFiscalConyugeMensual}
                onChange={(e) => setValues((v) => ({ ...v, creditoFiscalConyugeMensual: e.target.value }))} />
            </div>
          </div>

          {/* Tramos ISR */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[12.5px] font-bold text-ink">Tramos del impuesto sobre la renta</span>
              <span className="text-[11.5px] text-ink-faint">montos mensuales</span>
              <button
                type="button"
                onClick={() =>
                  setValues((v) => ({
                    ...v,
                    isrBrackets: [...v.isrBrackets, { limiteInferior: "0", limiteSuperior: null, tasaPct: 0 }],
                  }))
                }
                className="ml-auto text-[12px] font-semibold text-brand hover:underline"
              >
                + Agregar tramo
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {values.isrBrackets.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_100px_36px] items-center gap-2">
                  <input inputMode="decimal" className={`num text-right ${field}`} placeholder="Desde ₡"
                    value={b.limiteInferior} onChange={(e) => setBracket(i, { limiteInferior: e.target.value })} />
                  <input inputMode="decimal" className={`num text-right ${field}`} placeholder="Hasta ₡ (vacío = sin tope)"
                    value={b.limiteSuperior ?? ""}
                    onChange={(e) => setBracket(i, { limiteSuperior: e.target.value === "" ? null : e.target.value })} />
                  <input inputMode="decimal" className={`num text-right ${field}`} placeholder="%"
                    value={b.tasaPct} onChange={(e) => setBracket(i, { tasaPct: Number(e.target.value.replace(",", ".")) || 0 })} />
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, isrBrackets: v.isrBrackets.filter((_, j) => j !== i) }))}
                    className="flex size-[34px] items-center justify-center rounded-[10px] text-ink-faint transition-colors duration-[140ms] hover:text-bad-text"
                    aria-label={`Quitar tramo ${i + 1}`}
                  >
                    <Trash2 size={14} strokeWidth={1.8} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2 text-[12.5px] text-[#8E3323]">
              <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={guardar}
            className="mt-3 h-[38px] rounded-[10px] bg-brand px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
          >
            {pending ? "Guardando…" : "Guardar período fiscal"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
