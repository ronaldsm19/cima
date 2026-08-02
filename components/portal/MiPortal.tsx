"use client";

import { CalendarDays, CreditCard, Folder, Wallet } from "lucide-react";
import { useState } from "react";
import { AvatarInitials } from "@/components/ds/AvatarInitials";
import { Pill } from "@/components/ds/Pill";
import { StatCard } from "@/components/ds/StatCard";
import { formatCRC, formatCRC0 } from "@/lib/format/currency";
import { formatDateCR } from "@/lib/format/dates";
import { formatDays } from "@/lib/payroll/vacations";
import type { MiPortalDTO } from "@/lib/portal/data";

const MODALIDAD = { SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual" } as const;

type Tab = "pagos" | "vacaciones" | "proyectos";

/** EMPLEADO portal: own payslips, own vacation balance, assigned projects. */
export function MiPortal({ data }: { data: MiPortalDTO }) {
  const [tab, setTab] = useState<Tab>("pagos");

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* Encabezado */}
      <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <div className="flex items-center gap-4 border-b border-line-soft px-5 py-[18px]">
          <AvatarInitials name={data.nombre} size={52} />
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="truncate text-[19px] font-bold tracking-[-0.02em] text-ink">{data.nombre}</h2>
            <div className="mt-0.5 text-[13px] text-ink-mid">
              {data.puesto} · desde <span className="num">{formatDateCR(data.ingreso)}</span> ·
              antigüedad {data.antiguedad}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-line-soft max-[960px]:grid-cols-2">
          <Cell label="Cédula" value={<span className="num">{data.cedula}</span>} />
          <Cell label="Modalidad de pago" value={MODALIDAD[data.modalidad]} />
          <Cell
            label="Cuenta de depósito"
            value={data.iban ? <span className="num text-[12px]">{data.iban}</span> : "—"}
          />
          <Cell
            label="Saldo de vacaciones"
            value={<span className="num text-brand">{formatDays(data.vacaciones.saldo)} días</span>}
          />
        </div>
      </section>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3.5 max-[960px]:grid-cols-1">
        <StatCard
          icon={CreditCard}
          label={data.proximoPago?.pagado ? "Último pago" : "Próximo pago"}
          value={data.proximoPago?.neto ? formatCRC0(data.proximoPago.neto) : "—"}
          tint={data.proximoPago && !data.proximoPago.pagado ? "amber" : "brand"}
          foot={
            data.proximoPago ? (
              <span>
                {data.proximoPago.periodo} ·{" "}
                {data.proximoPago.pagado
                  ? "aplicado"
                  : `se paga el ${formatDateCR(data.proximoPago.payDate)}`}
              </span>
            ) : (
              <span>Todavía no hay planillas aprobadas</span>
            )
          }
        />
        <StatCard
          icon={CalendarDays}
          label="Vacaciones disponibles"
          value={`${formatDays(data.vacaciones.saldo)} días`}
          foot={
            <span>
              {formatDays(data.vacaciones.acumulado)} acumulados ·{" "}
              {formatDays(data.vacaciones.tomados)} tomados
            </span>
          }
        />
        <StatCard
          icon={Folder}
          label="Proyectos asignados"
          tint="neutral"
          value={String(data.misProyectos.length)}
          foot={
            <span>
              {data.misProyectos.filter((p) => p.pill.label === "vencido").length > 0
                ? `${data.misProyectos.filter((p) => p.pill.label === "vencido").length} con entrega vencida`
                : "al día con las entregas"}
            </span>
          }
        />
      </div>

      {/* Pestañas */}
      <div className="flex w-fit rounded-[11px] bg-[#EBEFE9] p-1">
        {(
          [
            ["pagos", "Mis colillas"],
            ["vacaciones", "Mis vacaciones"],
            ["proyectos", "Mis proyectos"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-[30px] rounded-lg px-3.5 text-[12.5px] font-semibold transition-colors duration-[140ms] ${
              tab === key ? "bg-surface text-ink shadow-[0_1px_2px_rgba(19,26,23,0.10)]" : "text-ink-mid"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pagos" ? <TabPagos data={data} /> : null}
      {tab === "vacaciones" ? <TabVacaciones data={data} /> : null}
      {tab === "proyectos" ? <TabProyectos data={data} /> : null}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 pb-4 pt-3.5">
      <div className="text-[11.5px] font-semibold text-ink-dim">{label}</div>
      <div className="mt-1 text-[14.5px] text-ink">{value}</div>
    </div>
  );
}

function TabPagos({ data }: { data: MiPortalDTO }) {
  if (data.colillas.length === 0) {
    return (
      <Empty
        title="Todavía no tenés colillas"
        detail="Cuando se apruebe la planilla del período, el desglose aparece acá."
      />
    );
  }
  return (
    <section className="overflow-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <table className="w-full min-w-[680px] border-collapse">
        <thead className="bg-surface-subtle">
          <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
            <th className="px-4 text-left">Período</th>
            <th className="px-2 text-left">Pagado el</th>
            <th className="px-2 text-right">Bruto</th>
            <th className="px-2 text-right">Deducciones</th>
            <th className="px-2 text-right">Neto</th>
            <th className="w-[110px] px-4 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.colillas.map((c) => (
            <tr key={c.itemId} className="h-[46px] border-b border-line-row text-[13px] hover:bg-row-hover">
              <td className="px-4 font-semibold text-ink">{c.periodo}</td>
              <td className="num px-2 text-[12.5px] text-ink-mid">
                {c.pagadoEl ? formatDateCR(c.pagadoEl) : "—"}
              </td>
              <td className="num-right px-2">{formatCRC(c.bruto)}</td>
              <td className="num-right px-2 text-ink-dim">−{formatCRC(c.deducciones)}</td>
              <td className="num-right px-2 font-semibold">{formatCRC(c.neto)}</td>
              <td className="px-4">
                <Pill tone={c.pagado ? "pagado" : "pendiente"}>{c.pagado ? "pagado" : "pendiente"}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TabVacaciones({ data }: { data: MiPortalDTO }) {
  return (
    <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <header className="flex h-[54px] items-center gap-3 border-b border-line-soft px-4">
        <h3 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">Períodos registrados</h3>
        <span className="num text-[12px] text-ink-dim">
          {formatDays(data.vacaciones.acumulado)} acumulados ·{" "}
          {formatDays(data.vacaciones.tomados)} tomados ·{" "}
          <span className="font-semibold text-brand">{formatDays(data.vacaciones.saldo)} de saldo</span>
        </span>
      </header>
      {data.misVacaciones.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-10 text-center">
          <div className="text-[14px] font-semibold text-ink">Nunca has tomado vacaciones</div>
          <div className="text-[12.5px] text-ink-mid">
            Coordiná las fechas en la oficina; una vez registradas aparecen acá.
          </div>
        </div>
      ) : (
        <ul className="px-2 py-1.5">
          {data.misVacaciones.map((v) => {
            const [ini, fin] = v.rango.split(" — ");
            return (
              <li key={v.rango} className="flex h-[46px] items-center gap-3 rounded-[10px] px-2 hover:bg-row-hover">
                <span className="num text-[12.5px] text-ink">
                  {formatDateCR(ini)} – {formatDateCR(fin)}
                </span>
                <span className="min-w-0 flex-1 text-[12px] text-ink-faint">{v.estado}</span>
                <Pill tone="neutro">
                  {formatDays(v.dias)} día{v.dias !== 1 ? "s" : ""}
                </Pill>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TabProyectos({ data }: { data: MiPortalDTO }) {
  if (data.misProyectos.length === 0) {
    return (
      <Empty
        title="No tenés proyectos asignados"
        detail="Cuando te asignen a un trabajo, vas a ver acá su avance, la finca y el plano."
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3.5 max-[960px]:grid-cols-1">
      {data.misProyectos.map((p) => (
        <article
          key={p.id}
          className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]"
        >
          <div className="flex items-center gap-2">
            <span className="num text-[11.5px] text-ink-dim">{p.code}</span>
            <Pill tone={p.pill.tone}>{p.pill.label}</Pill>
            {p.rol ? <span className="ml-auto text-[11.5px] text-ink-faint">{p.rol}</span> : null}
          </div>
          <div className="mt-1 text-[14.5px] font-semibold text-ink">{p.trabajo}</div>
          <div className="text-[12.5px] text-ink-mid">{p.cliente}</div>
          <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-dim">
            <span>{p.fincaPlano}</span>
            {p.plano ? <span>plano {p.plano}</span> : null}
            {p.entrega ? <span>entrega {formatDateCR(p.entrega)}</span> : null}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EDF0EC]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1B9E70] to-[#0E6B4E] transition-[width] duration-300"
              style={{ width: `${p.pctCobrado}%` }}
            />
          </div>
          <div className="num mt-1.5 text-[11.5px] text-ink-dim">{p.pctCobrado}% cobrado</div>
        </article>
      ))}
    </div>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface py-12 text-center shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <div className="flex size-[38px] items-center justify-center rounded-full bg-brand-tint text-brand">
        <Wallet size={18} strokeWidth={2} aria-hidden />
      </div>
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      <div className="max-w-[420px] text-[12.5px] text-ink-mid">{detail}</div>
    </section>
  );
}
