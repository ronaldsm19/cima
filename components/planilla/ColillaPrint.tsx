"use client";

import { Printer } from "lucide-react";
import { Pill } from "@/components/ds/Pill";
import { formatCRC } from "@/lib/format/currency";
import { formatDateCR } from "@/lib/format/dates";

export interface ColillaData {
  periodo: string;
  payDate: string;
  empleado: string;
  cedula: string;
  puesto: string;
  iban: string | null;
  modalidad: string;
  basePeriodo: string;
  montoExtra: string;
  horasExtra: number;
  bruto: string;
  ccssSem: string;
  ccssIvm: string;
  ccssBp: string;
  ccssTotal: string;
  renta: string;
  solidarista: string;
  embargo: string;
  otras: string;
  adelanto: string;
  totalDeducciones: string;
  neto: string;
  pagado: boolean;
  paidAt: string | null;
}

const MODALIDAD: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

/** Printable payslip — `print:` utilities strip the chrome for paper/PDF. */
export function ColillaPrint({ data }: { data: ColillaData }) {
  const deducciones: { label: string; nota?: string; monto: string }[] = [
    { label: "CCSS · SEM", monto: data.ccssSem },
    { label: "CCSS · IVM", monto: data.ccssIvm },
    { label: "CCSS · Banco Popular", monto: data.ccssBp },
    { label: "Impuesto sobre la renta", nota: "escala mensual prorrateada", monto: data.renta },
    { label: "Asociación solidarista", monto: data.solidarista },
    { label: "Pensión alimenticia", nota: "orden judicial", monto: data.embargo },
    { label: "Otras deducciones", monto: data.otras },
    { label: "Adelanto del período", nota: "vale de caja", monto: data.adelanto },
  ].filter((d) => Number(d.monto) > 0);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <span className="text-[12.5px] text-ink-mid">
          Vista de impresión · usá Imprimir para enviarla a papel o guardarla en PDF.
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-[34px] items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover"
        >
          <Printer size={14} strokeWidth={2} aria-hidden /> Imprimir
        </button>
      </div>

      <article className="rounded-xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(19,26,23,0.04)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Encabezado */}
        <header className="flex items-start justify-between gap-4 border-b border-line-soft pb-4">
          <div>
            <div className="text-[13.5px] font-bold text-brand">Morales &amp; Asoc.</div>
            <div className="text-[11.5px] text-ink-dim">Topografía · CFIA IC-4482</div>
          </div>
          <div className="text-right">
            <div className="text-[15px] font-bold tracking-[-0.01em] text-ink">
              Colilla de pago
            </div>
            <div className="text-[12px] text-ink-mid">{data.periodo}</div>
            <div className="num text-[11.5px] text-ink-dim">
              Pago: {formatDateCR(data.payDate)}
            </div>
          </div>
        </header>

        {/* Datos del empleado */}
        <section className="grid grid-cols-4 gap-3 border-b border-line-soft py-4 max-[960px]:grid-cols-2">
          <Field label="Empleado" value={data.empleado} />
          <Field label="Cédula" value={<span className="num">{data.cedula}</span>} />
          <Field label="Puesto" value={data.puesto} />
          <Field label="Modalidad" value={MODALIDAD[data.modalidad] ?? data.modalidad} />
        </section>

        {/* Ingresos */}
        <section className="py-4">
          <h2 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-dim">
            Ingresos
          </h2>
          <Row label="Salario base del período" monto={data.basePeriodo} />
          {Number(data.montoExtra) > 0 ? (
            <Row
              label="Horas extra"
              nota={`${data.horasExtra} h × 1,5`}
              monto={data.montoExtra}
              tone="ok"
            />
          ) : null}
          <Row label="Bruto del período" monto={data.bruto} strong />
        </section>

        {/* Deducciones */}
        <section className="border-t border-line-soft py-4">
          <h2 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-dim">
            Deducciones
          </h2>
          {deducciones.length === 0 ? (
            <div className="py-2 text-[12.5px] text-ink-faint">Sin deducciones este período.</div>
          ) : (
            deducciones.map((d) => (
              <Row key={d.label} label={d.label} nota={d.nota} monto={d.monto} negative />
            ))
          )}
          <Row label="Total de deducciones" monto={data.totalDeducciones} negative strong />
        </section>

        {/* Neto */}
        <section className="flex items-center justify-between rounded-xl border border-brand-tint-border bg-brand-tint-soft px-5 py-4">
          <div>
            <div className="text-[13px] font-semibold text-ink">Neto a pagar</div>
            {data.iban ? (
              <div className="num mt-0.5 text-[11px] text-ink-dim">Depósito a {data.iban}</div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="num text-[22px] font-bold text-brand">{formatCRC(data.neto)}</div>
            <div className="mt-1 flex justify-end">
              <Pill tone={data.pagado ? "pagado" : "pendiente"}>
                {data.pagado
                  ? data.paidAt
                    ? `pagado ${formatDateCR(data.paidAt)}`
                    : "pagado"
                  : "pendiente"}
              </Pill>
            </div>
          </div>
        </section>

        <footer className="mt-5 grid grid-cols-2 gap-10 pt-6 text-center text-[11px] text-ink-dim">
          <div className="border-t border-[#C6D0C7] pt-1.5">Recibí conforme</div>
          <div className="border-t border-[#C6D0C7] pt-1.5">Por la empresa</div>
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-ink-dim">{label}</div>
      <div className="mt-0.5 text-[13px] text-ink">{value}</div>
    </div>
  );
}

function Row({
  label,
  nota,
  monto,
  negative,
  strong,
  tone,
}: {
  label: string;
  nota?: string;
  monto: string;
  negative?: boolean;
  strong?: boolean;
  tone?: "ok";
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-line-hair py-1.5 last:border-b-0 ${
        strong ? "font-semibold" : ""
      }`}
    >
      <span className="text-[12.5px] text-ink">
        {label}
        {nota ? <span className="ml-1.5 text-[11px] text-ink-faint">{nota}</span> : null}
      </span>
      <span
        className={`num text-[13px] ${tone === "ok" ? "text-ok" : negative ? "text-ink-mid" : "text-ink"}`}
      >
        {negative ? "−" : ""}
        {formatCRC(monto)}
      </span>
    </div>
  );
}
