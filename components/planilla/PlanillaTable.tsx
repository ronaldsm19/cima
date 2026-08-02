"use client";

import { Check, Plus, UserPlus, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AvatarInitials } from "@/components/ds/AvatarInitials";
import { Pill } from "@/components/ds/Pill";
import { EmployeeModal } from "@/components/empleados/EmployeeModal";
import { approvePlanilla, markPaid, updatePlanillaLine } from "@/lib/actions/planilla";
import { formatCRC } from "@/lib/format/currency";
import { MODALIDAD_LABEL, type PlanillaDTO, type PlanillaLineDTO } from "@/lib/planilla/dto";
import { BreakdownPanel } from "./BreakdownPanel";
import { lineBreakdown, sanitizeHours, sanitizeMoney, type LineBreakdown } from "./breakdown";
import { Decimal } from "decimal.js";

interface Inputs {
  horas: string;
  adelanto: string;
}

function initialInputs(lines: PlanillaLineDTO[]): Record<string, Inputs> {
  const map: Record<string, Inputs> = {};
  for (const l of lines) {
    map[l.itemId] = {
      horas: l.horasExtra === 0 ? "0" : String(l.horasExtra),
      adelanto: new Decimal(l.adelanto).isZero() ? "0" : new Decimal(l.adelanto).toFixed(0),
    };
  }
  return map;
}

export function PlanillaTable({ data }: { data: PlanillaDTO }) {
  const router = useRouter();
  const [inputs, setInputs] = useState<Record<string, Inputs>>(() => initialInputs(data.lines));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [detalle, setDetalle] = useState<string | null>(null);
  const [altaModal, setAltaModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const editable = data.status === "BORRADOR" && data.permisos.editar;

  const breakdowns = useMemo(() => {
    const map = new Map<string, LineBreakdown>();
    for (const line of data.lines) {
      const i = inputs[line.itemId] ?? { horas: "0", adelanto: "0" };
      map.set(line.itemId, lineBreakdown(line, i.horas === "" ? 0 : i.horas, i.adelanto, data.params));
    }
    return map;
  }, [data.lines, data.params, inputs]);

  const totals = useMemo(() => {
    const zero = new Decimal(0);
    let base = zero, extra = zero, bruto = zero, ccss = zero, renta = zero, adelanto = zero, otras = zero, neto = zero, horas = 0;
    for (const line of data.lines) {
      const bd = breakdowns.get(line.itemId)!;
      base = base.plus(bd.basePeriodo);
      extra = extra.plus(bd.montoExtra);
      bruto = bruto.plus(bd.bruto);
      ccss = ccss.plus(bd.ccssTotal);
      renta = renta.plus(bd.renta);
      adelanto = adelanto.plus(bd.adelanto);
      otras = otras.plus(bd.otrasColumna);
      neto = neto.plus(bd.neto);
      horas += sanitizeHours(inputs[line.itemId]?.horas ?? "0");
    }
    return { base, extra, bruto, ccss, renta, adelanto, otras, neto, horas };
  }, [breakdowns, data.lines, inputs]);

  const anyError = data.lines.some((l) => breakdowns.get(l.itemId)!.error);
  const selNeto = useMemo(() => {
    let sum = new Decimal(0);
    for (const id of sel) sum = sum.plus(breakdowns.get(id)?.neto ?? 0);
    return sum;
  }, [sel, breakdowns]);

  // ── Persistence ────────────────────────────────────────────────────────────
  const persistLine = (line: PlanillaLineDTO) => {
    const i = inputs[line.itemId];
    if (!i) return;
    const horas = sanitizeHours(i.horas);
    const adelanto = new Decimal(sanitizeMoney(i.adelanto)).toFixed(2);
    if (horas === line.horasExtra && adelanto === line.adelanto) return;
    startTransition(async () => {
      const res = await updatePlanillaLine({ itemId: line.itemId, horasExtra: horas, adelanto });
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  };

  const setLineInput = (itemId: string, patch: Partial<Inputs>) => {
    setInputs((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const toggleSel = (itemId: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = () => {
    setSel((prev) => (prev.size === data.lines.length ? new Set() : new Set(data.lines.map((l) => l.itemId))));
  };

  const doMarkPaid = (ids: string[], pagado: boolean) => {
    startTransition(async () => {
      const res = await markPaid(ids, pagado);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(
          pagado
            ? ids.length === 1
              ? "Pago aplicado."
              : `${ids.length} pagos aplicados.`
            : "Pago revertido.",
        );
        setSel(new Set());
        router.refresh();
      }
    });
  };

  const doApprove = () => {
    if (!window.confirm("¿Aprobar la planilla del período? Los montos calculados quedan congelados y ya no se podrán editar.")) return;
    startTransition(async () => {
      const res = await approvePlanilla(data.periodId);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Planilla aprobada. Los montos quedaron congelados.");
        router.refresh();
      }
    });
  };

  const detalleLine = detalle ? data.lines.find((l) => l.itemId === detalle) : null;

  const ghostBtn =
    "flex h-8 items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3 text-[12.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app hover:border-[#C6D0C7] disabled:cursor-not-allowed disabled:border-[#EAEEE8] disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-semibold ${
            sel.size > 0 ? "bg-brand-tint text-brand" : "bg-[#EDF0EC] text-ink-dim"
          }`}
        >
          {sel.size > 0 ? (
            <>
              {sel.size} seleccionado{sel.size > 1 ? "s" : ""} ·&nbsp;
              <span className="num">{formatCRC(selNeto)}</span>
            </>
          ) : (
            "Ninguna fila seleccionada"
          )}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {editable ? (
            <button type="button" className={ghostBtn} onClick={() => setAltaModal(true)}>
              <Plus size={14} strokeWidth={2} aria-hidden /> Agregar empleado
            </button>
          ) : null}
          {data.permisos.marcarPagos ? (
            <button
              type="button"
              className={ghostBtn}
              disabled={sel.size === 0 || pending}
              onClick={() => doMarkPaid([...sel], true)}
            >
              Marcar como pagado
            </button>
          ) : null}
          {data.permisos.generarColillas ? (
            <button type="button" className={ghostBtn} disabled title="Llega con los reportes (Fase 9)">
              <FileText size={14} strokeWidth={2} aria-hidden /> Generar colillas
            </button>
          ) : null}
          {data.status === "BORRADOR" && data.permisos.aprobar ? (
            <button
              type="button"
              disabled={anyError || pending || data.lines.length === 0}
              onClick={doApprove}
              title={anyError ? "Hay filas con errores: corregí los adelantos antes de aprobar." : undefined}
              className="flex h-8 items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[12.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
            >
              <Check size={14} strokeWidth={2.2} aria-hidden /> Aprobar planilla
            </button>
          ) : data.status !== "BORRADOR" ? (
            <Pill tone="pagado">
              {data.status === "PAGADA" ? "período pagado" : "planilla aprobada"}
            </Pill>
          ) : null}
        </div>
      </div>

      {/* Tabla + panel de desglose */}
      <div className="flex min-h-0 flex-1 items-stretch gap-4 max-[960px]:flex-col">
        <div className="min-w-0 flex-1 overflow-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          {data.lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <div className="flex size-[38px] items-center justify-center rounded-full bg-brand-tint text-brand">
                <UserPlus size={18} strokeWidth={2} aria-hidden />
              </div>
              <div className="text-[14px] font-semibold text-ink">No hay empleados en este período</div>
              <div className="text-[12.5px] text-ink-mid">
                Agregá el primer empleado para calcular la planilla.
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[1120px] border-collapse">
              <thead className="sticky top-0 z-10 bg-surface-subtle">
                <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
                  <th className="w-10 px-3 text-left">
                    <input
                      type="checkbox"
                      className="size-4 accent-[#0E6B4E]"
                      checked={sel.size === data.lines.length && data.lines.length > 0}
                      onChange={toggleAll}
                      aria-label="Seleccionar todas las filas"
                    />
                  </th>
                  <th className="px-2 text-left font-semibold">Empleado</th>
                  <th className="px-2 text-left font-semibold">Modo</th>
                  <th className="px-2 text-right font-semibold">Base período</th>
                  <th className="px-2 text-right font-semibold">H. extra</th>
                  <th className="px-2 text-right font-semibold">Bruto</th>
                  <th className="px-2 text-right font-semibold">CCSS</th>
                  <th className="px-2 text-right font-semibold">Renta</th>
                  <th className="px-2 text-right font-semibold">Adelanto</th>
                  <th className="px-2 text-right font-semibold">Otras ded.</th>
                  <th className="px-2 text-right font-bold text-ink-strong">Neto</th>
                  <th className="w-[104px] px-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => {
                  const bd = breakdowns.get(line.itemId)!;
                  const i = inputs[line.itemId] ?? { horas: "0", adelanto: "0" };
                  const open = detalle === line.itemId;
                  return (
                    <LineRow
                      key={line.itemId}
                      line={line}
                      bd={bd}
                      inputs={i}
                      open={open}
                      selected={sel.has(line.itemId)}
                      editable={editable}
                      onToggleSel={() => toggleSel(line.itemId)}
                      onOpen={() => setDetalle(open ? null : line.itemId)}
                      onInput={(patch) => setLineInput(line.itemId, patch)}
                      onBlur={() => persistLine(line)}
                    />
                  );
                })}
                {/* Fila de totales */}
                <tr className="h-[52px] bg-surface-subtle text-[12.5px] font-bold">
                  <td className="px-3" />
                  <td className="px-2 text-ink" colSpan={2}>
                    Total · {data.lines.length} empleado{data.lines.length !== 1 ? "s" : ""}
                  </td>
                  <td className="num-right px-2">{formatCRC(totals.base)}</td>
                  <td className="num-right px-2">{totals.horas} h</td>
                  <td className="num-right px-2">{formatCRC(totals.bruto)}</td>
                  <td className="num-right px-2 text-ink-dim">{formatCRC(totals.ccss)}</td>
                  <td className="num-right px-2 text-ink-dim">
                    {totals.renta.gt(0) ? formatCRC(totals.renta) : "—"}
                  </td>
                  <td className="num-right px-2 text-ink-dim">
                    {totals.adelanto.gt(0) ? formatCRC(totals.adelanto) : "—"}
                  </td>
                  <td className="num-right px-2 text-ink-dim">
                    {totals.otras.gt(0) ? formatCRC(totals.otras) : "—"}
                  </td>
                  <td className="num-right px-2 text-[15px]">{formatCRC(totals.neto)}</td>
                  <td className="px-3" />
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {detalleLine ? (
          <BreakdownPanel
            line={detalleLine}
            bd={breakdowns.get(detalleLine.itemId)!}
            horas={inputs[detalleLine.itemId]?.horas ?? "0"}
            canMarkPaid={data.permisos.marcarPagos}
            busy={pending}
            onClose={() => setDetalle(null)}
            onMarkPaid={(pagado) => doMarkPaid([detalleLine.itemId], pagado)}
          />
        ) : null}
      </div>

      <p className="text-[12px] text-ink-dim">
        Los empleados semanales muestran las dos semanas del período. Clic en una fila abre el
        desglose; las celdas de horas extra y adelantos se editan en línea.{" "}
        <Link href="/planilla/periodos" className="font-semibold text-brand hover:underline">
          Ver historial de períodos
        </Link>
      </p>

      {altaModal ? (
        <EmployeeModal params={data.params} onClose={() => setAltaModal(false)} />
      ) : null}
    </div>
  );
}

// ── Fila ─────────────────────────────────────────────────────────────────────

function LineRow({
  line,
  bd,
  inputs,
  open,
  selected,
  editable,
  onToggleSel,
  onOpen,
  onInput,
  onBlur,
}: {
  line: PlanillaLineDTO;
  bd: LineBreakdown;
  inputs: Inputs;
  open: boolean;
  selected: boolean;
  editable: boolean;
  onToggleSel: () => void;
  onOpen: () => void;
  onInput: (patch: Partial<Inputs>) => void;
  onBlur: () => void;
}) {
  const cellInput =
    "num h-[30px] w-[82px] rounded-lg border border-transparent bg-transparent px-2 text-right text-[13px] outline-none transition-colors duration-[140ms] focus:border-brand focus:bg-surface focus:shadow-[0_0_0_3px_rgba(14,107,78,0.12)]";
  const errorInput = "border-[#E5A99E] bg-bad-tint-soft text-bad-text";

  return (
    <>
      <tr
        onClick={onOpen}
        className={`h-14 cursor-pointer border-b border-line-row text-[13px] transition-colors duration-[140ms] ${
          open ? "bg-tint-active" : "hover:bg-row-hover"
        }`}
      >
        <td className="px-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="size-4 accent-[#0E6B4E]"
            checked={selected}
            onChange={onToggleSel}
            aria-label={`Seleccionar a ${line.nombre}`}
          />
        </td>
        <td className="px-2">
          <div className="flex items-center gap-2.5">
            <AvatarInitials name={line.nombre} size={28} />
            <span className="truncate text-[13.5px] font-semibold text-ink">{line.nombre}</span>
          </div>
        </td>
        <td className="px-2 text-[12px] text-ink-mid">{MODALIDAD_LABEL[line.modalidad]}</td>
        <td className="num-right px-2">{formatCRC(bd.basePeriodo)}</td>
        <td className="px-2 text-right" onClick={(e) => e.stopPropagation()}>
          {editable ? (
            <input
              inputMode="decimal"
              value={inputs.horas}
              onChange={(e) => onInput({ horas: e.target.value })}
              onBlur={onBlur}
              className={cellInput}
              aria-label={`Horas extra de ${line.nombre}`}
            />
          ) : (
            <span className="num-right block px-2">{line.horasExtra || "—"}</span>
          )}
        </td>
        <td className="num-right px-2">{formatCRC(bd.bruto)}</td>
        <td className="num-right px-2 text-ink-dim">{formatCRC(bd.ccssTotal)}</td>
        <td className="num-right px-2 text-ink-dim">{bd.renta.gt(0) ? formatCRC(bd.renta) : "—"}</td>
        <td className="px-2 text-right" onClick={(e) => e.stopPropagation()}>
          {editable ? (
            <input
              inputMode="decimal"
              value={inputs.adelanto}
              onChange={(e) => onInput({ adelanto: e.target.value })}
              onBlur={onBlur}
              className={`${cellInput} ${bd.error ? errorInput : ""}`}
              aria-label={`Adelanto de ${line.nombre}`}
              aria-invalid={bd.error ? true : undefined}
            />
          ) : (
            <span className="num-right block px-2 text-ink-dim">
              {bd.adelanto.gt(0) ? formatCRC(bd.adelanto) : "—"}
            </span>
          )}
        </td>
        <td className="num-right px-2 text-ink-dim">
          {bd.otrasColumna.gt(0) ? formatCRC(bd.otrasColumna) : "—"}
        </td>
        <td className="num-right px-2 text-[13.5px] font-semibold">{formatCRC(bd.neto)}</td>
        <td className="px-3">
          <Pill tone={line.pagado ? "pagado" : "pendiente"}>{line.pagado ? "pagado" : "pendiente"}</Pill>
        </td>
      </tr>
      {bd.error ? (
        <tr>
          <td colSpan={12} className="px-3 pb-2">
            <div className="flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2 text-[12.5px] text-[#8E3323]">
              <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
              <span>{bd.error}</span>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
