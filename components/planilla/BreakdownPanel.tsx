"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { AvatarInitials } from "@/components/ds/AvatarInitials";
import { formatCRC } from "@/lib/format/currency";
import type { PlanillaLineDTO } from "@/lib/planilla/dto";
import type { LineBreakdown } from "./breakdown";

interface RowSpec {
  label: string;
  note: string;
  value: string | null; // formatted; null renders the grey em dash
  tone?: "plus" | "minus" | "bad";
}

/** 392px right panel: 8-line desglose, neto block, IBAN, actions (README §2). */
export function BreakdownPanel({
  line,
  bd,
  horas,
  periodId,
  canMarkPaid,
  busy,
  onClose,
  onMarkPaid,
}: {
  line: PlanillaLineDTO;
  bd: LineBreakdown;
  horas: string | number;
  periodId: string;
  canMarkPaid: boolean;
  busy: boolean;
  onClose: () => void;
  onMarkPaid: (pagado: boolean) => void;
}) {
  const solidaristaPct = line.adjustments.find((a) => a.type === "SOLIDARISTA")?.ratePct;

  const rows: RowSpec[] = [
    {
      label: "Salario base del período",
      note: line.modalidad === "SEMANAL" ? "semanal" : line.modalidad.toLowerCase(),
      value: formatCRC(bd.basePeriodo),
    },
    {
      label: "Horas extra",
      note: bd.montoExtra.gt(0) ? `${horas} h × 1,5` : "sin horas este corte",
      value: bd.montoExtra.gt(0) ? `+${formatCRC(bd.montoExtra)}` : null,
      tone: "plus",
    },
    { label: "Bruto del período", note: "", value: formatCRC(bd.bruto) },
    {
      label: "CCSS obrero",
      note: "10,67 %",
      value: `−${formatCRC(bd.ccssTotal)}`,
      tone: "minus",
    },
    {
      label: "Impuesto sobre la renta",
      note: "escala mensual",
      value: bd.renta.gt(0) ? `−${formatCRC(bd.renta)}` : null,
      tone: "minus",
    },
    {
      label: "Asociación solidarista",
      note: solidaristaPct != null ? `${String(solidaristaPct).replace(".", ",")} % del bruto` : "no afiliado",
      value: bd.solidarista.gt(0) ? `−${formatCRC(bd.solidarista)}` : null,
      tone: "minus",
    },
    {
      label: "Pensión alimenticia",
      note: bd.embargo.gt(0) ? "orden judicial" : "sin orden",
      value: bd.embargo.gt(0) ? `−${formatCRC(bd.embargo)}` : null,
      tone: "bad",
    },
    {
      label: "Adelanto del período",
      note: "vale de caja",
      value: bd.adelanto.gt(0) ? `−${formatCRC(bd.adelanto)}` : null,
      tone: "minus",
    },
  ];

  return (
    <aside className="flex w-[392px] flex-none flex-col overflow-y-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)] max-[960px]:w-full">
      {/* Encabezado */}
      <div className="flex items-center gap-3 border-b border-line-soft p-4">
        <AvatarInitials name={line.nombre} size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15.5px] font-bold text-ink">{line.nombre}</div>
          <div className="num truncate text-[11.5px] text-ink-dim">
            {line.cedula} · {line.puesto}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-control-border text-ink-mid transition-colors duration-[140ms] hover:bg-app"
          aria-label="Cerrar desglose"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* Desglose */}
      <div className="flex flex-col px-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 border-b border-line-hair py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="text-[13px] text-ink">{row.label}</div>
              {row.note ? <div className="text-[11px] text-ink-faint">{row.note}</div> : null}
            </div>
            <div
              className={`num text-[13px] ${
                row.value === null
                  ? "text-ink-faint"
                  : row.tone === "bad"
                    ? "text-bad-text"
                    : row.tone === "plus"
                      ? "text-ok-text"
                      : "text-ink"
              }`}
            >
              {row.value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Neto */}
      <div className="p-4">
        <div className="flex items-center justify-between rounded-xl border border-brand-tint-border bg-brand-tint-soft px-4 py-3.5">
          <span className="text-[13px] font-semibold text-ink">Neto a pagar</span>
          <span className="num text-[20px] font-bold text-brand">{formatCRC(bd.neto)}</span>
        </div>
        {line.iban ? (
          <div className="num mt-2 text-[11px] text-ink-dim">Depósito a {line.iban}</div>
        ) : null}
      </div>

      {/* Acciones */}
      <div className="mt-auto flex items-center gap-2 border-t border-line-soft p-4">
        {canMarkPaid ? (
          line.pagado ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onMarkPaid(false)}
              className="h-[34px] flex-1 rounded-[10px] border border-control-border bg-surface text-[13px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app disabled:cursor-not-allowed disabled:text-ink-faint"
            >
              Revertir el pago
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onMarkPaid(true)}
              className="h-[34px] flex-1 rounded-[10px] bg-brand text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
            >
              Marcar como pagado
            </button>
          )
        ) : null}
        {line.snapshot ? (
          <Link
            href={`/planilla/${periodId}/colilla/${line.itemId}`}
            className="flex h-[34px] items-center rounded-[10px] border border-control-border bg-surface px-3 text-[13px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
          >
            Colilla
          </Link>
        ) : null}
        <Link
          href={`/empleados/${line.employeeId}`}
          className="flex h-[34px] items-center rounded-[10px] border border-control-border bg-surface px-3 text-[13px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
        >
          Ver ficha
        </Link>
      </div>
    </aside>
  );
}
