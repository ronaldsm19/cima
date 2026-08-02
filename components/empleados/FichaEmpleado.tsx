"use client";

import { CalendarDays, Pencil, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AvatarInitials } from "@/components/ds/AvatarInitials";
import { Pill } from "@/components/ds/Pill";
import { EmployeeModal } from "@/components/empleados/EmployeeModal";
import { deactivateEmployee } from "@/lib/actions/empleados";
import type { FichaEmpleadoDTO } from "@/lib/empleados/dto";
import { formatCRC } from "@/lib/format/currency";
import { formatDateCR } from "@/lib/format/dates";
import { formatDays } from "@/lib/payroll/vacations";

const MODALIDAD: Record<FichaEmpleadoDTO["modalidad"], string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

type Tab = "contrato" | "pagos" | "vacaciones";

export function FichaEmpleado({ ficha }: { ficha: FichaEmpleadoDTO }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("contrato");
  const [editModal, setEditModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const darDeBaja = () => {
    if (
      !window.confirm(
        `¿Dar de baja a ${ficha.nombre}? Sale de las planillas futuras; el historial y los períodos aprobados no se tocan.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deactivateEmployee(ficha.id);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`${ficha.nombre} quedó fuera de la planilla.`);
        router.push(res.employeeId ? `/empleados/${res.employeeId}` : "/empleados");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* Encabezado de ficha */}
      <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <div className="flex items-center gap-4 border-b border-line-soft px-5 py-[18px]">
          <AvatarInitials name={ficha.nombre} size={52} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate text-[19px] font-bold tracking-[-0.02em] text-ink">
                {ficha.nombre}
              </h2>
              {ficha.estado === "ACTIVO" ? (
                <Pill tone="pagado">
                  <span className="size-1.5 rounded-full bg-ok" aria-hidden /> Activo
                </Pill>
              ) : (
                <Pill tone="neutro">{ficha.estado.toLowerCase()}</Pill>
              )}
            </div>
            <div className="mt-0.5 text-[13px] text-ink-mid">
              {ficha.puesto} · desde <span className="num">{formatDateCR(ficha.hireDate)}</span> ·
              antigüedad {ficha.antiguedad}
            </div>
          </div>
          {ficha.permisos.crud ? (
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => setEditModal(true)}
                className="flex h-8 items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3 text-[12.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
              >
                <Pencil size={13} strokeWidth={2} aria-hidden /> Editar
              </button>
              <button
                type="button"
                disabled={pending || ficha.estado !== "ACTIVO"}
                onClick={darDeBaja}
                className="flex h-8 items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3 text-[12.5px] font-semibold text-bad-text transition-colors duration-[140ms] hover:border-bad-border hover:bg-bad-tint-soft disabled:cursor-not-allowed disabled:text-ink-faint"
              >
                <UserMinus size={13} strokeWidth={2} aria-hidden /> Dar de baja
              </button>
            </div>
          ) : null}
        </div>
        {/* Cajetín */}
        <div className="grid grid-cols-4 divide-x divide-line-soft max-[960px]:grid-cols-2">
          <CajetinCell label="Cédula" value={<span className="num">{ficha.cedula}</span>} />
          <CajetinCell label="Modalidad" value={MODALIDAD[ficha.modalidad]} />
          <CajetinCell
            label="Salario base"
            value={<span className="num">{formatCRC(ficha.salarioBase)}</span>}
          />
          <CajetinCell
            label="Saldo de vacaciones"
            value={
              <span className="num text-brand">{formatDays(ficha.vacaciones.saldo)} días</span>
            }
          />
        </div>
      </section>

      {/* Pestañas segmented */}
      <div className="flex w-fit rounded-[11px] bg-[#EBEFE9] p-1">
        {(
          [
            ["contrato", "Contrato"],
            ["pagos", "Historial de pagos"],
            ["vacaciones", "Vacaciones"],
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

      {tab === "contrato" ? <TabContrato ficha={ficha} /> : null}
      {tab === "pagos" ? <TabPagos ficha={ficha} /> : null}
      {tab === "vacaciones" ? <TabVacaciones ficha={ficha} /> : null}

      {editModal ? (
        <EmployeeModal
          params={ficha.params}
          initial={ficha.form}
          onClose={() => setEditModal(false)}
        />
      ) : null}
    </div>
  );
}

function CajetinCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 pb-4 pt-3.5">
      <div className="text-[11.5px] font-semibold text-ink-dim">{label}</div>
      <div className="mt-1 text-[14.5px] text-ink">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-hair py-2.5 last:border-b-0">
      <span className="text-[13px] text-ink-mid">{label}</span>
      <span className={`text-[13px] ${muted ? "text-ink-faint" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function TabContrato({ ficha }: { ficha: FichaEmpleadoDTO }) {
  return (
    <div className="grid grid-cols-2 gap-4 max-[960px]:grid-cols-1">
      <section className="rounded-xl border border-line bg-surface px-5 py-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <h3 className="mb-1 text-[14.5px] font-bold tracking-[-0.01em] text-ink">Contrato</h3>
        <InfoRow label="Puesto" value={ficha.puesto} />
        <InfoRow label="Modalidad" value={MODALIDAD[ficha.modalidad]} />
        <InfoRow label="Salario base" value={<span className="num">{formatCRC(ficha.salarioBase)}</span>} />
        <InfoRow
          label="Equivalente mensual"
          value={<span className="num">{formatCRC(ficha.mensualEquivalente)}</span>}
        />
        <InfoRow label="Ingreso" value={<span className="num">{formatDateCR(ficha.hireDate)}</span>} />
        <InfoRow
          label="Teléfono"
          value={ficha.telefono ? <span className="num">{ficha.telefono}</span> : "—"}
          muted={!ficha.telefono}
        />
        <InfoRow
          label="Cuenta IBAN"
          value={ficha.iban ? <span className="num text-[12px]">{ficha.iban}</span> : "—"}
          muted={!ficha.iban}
        />
      </section>

      <section className="flex flex-col rounded-xl border border-line bg-surface px-5 py-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <h3 className="mb-1 text-[14.5px] font-bold tracking-[-0.01em] text-ink">Deducciones fijas</h3>
        <InfoRow label="CCSS obrero" value={<span className="num">{ficha.deducciones.ccssPct}</span>} />
        <InfoRow
          label="Renta del período"
          value={
            ficha.deducciones.rentaPeriodo ? (
              <span className="num">−{formatCRC(ficha.deducciones.rentaPeriodo)}</span>
            ) : (
              "no alcanza la escala"
            )
          }
          muted={!ficha.deducciones.rentaPeriodo}
        />
        <InfoRow
          label="Asociación solidarista"
          value={
            ficha.solidaristaPct != null
              ? `${String(ficha.solidaristaPct).replace(".", ",")} % del bruto`
              : "no afiliado"
          }
          muted={ficha.solidaristaPct == null}
        />
        <InfoRow
          label="Pensión alimenticia"
          value={
            ficha.embargo ? (
              <span className="num text-bad-text">−{formatCRC(ficha.embargo)}</span>
            ) : (
              "sin orden"
            )
          }
          muted={!ficha.embargo}
        />
        <InfoRow
          label="Adelantos vigentes"
          value={
            ficha.deducciones.adelantoVigente ? (
              <span className="num">−{formatCRC(ficha.deducciones.adelantoVigente)}</span>
            ) : (
              "sin adelantos"
            )
          }
          muted={!ficha.deducciones.adelantoVigente}
        />
        <div className="mt-auto rounded-[10px] bg-row-hover px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-mid">
          La renta se calcula con la escala mensual vigente y se prorratea por quincena. La CCSS y
          los topes cambian por ley: se editan en Configuración, sin tocar código.
        </div>
      </section>
    </div>
  );
}

function TabPagos({ ficha }: { ficha: FichaEmpleadoDTO }) {
  if (ficha.historial.length === 0) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface py-12 text-center shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <div className="text-[14px] font-semibold text-ink">Todavía no hay pagos aplicados</div>
        <div className="text-[12.5px] text-ink-mid">
          Cuando se apruebe una planilla con {ficha.nombre.split(" ")[0]}, el desglose aparece acá.
        </div>
      </section>
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
            <th className="w-[100px] px-4" />
          </tr>
        </thead>
        <tbody>
          {ficha.historial.map((h) => (
            <tr key={h.itemId} className="h-[46px] border-b border-line-row text-[13px] hover:bg-row-hover">
              <td className="px-4 font-semibold text-ink">{h.periodo}</td>
              <td className="num px-2 text-[12.5px] text-ink-mid">
                {h.pagadoEl ? formatDateCR(h.pagadoEl) : "—"}
              </td>
              <td className="num-right px-2">{formatCRC(h.bruto)}</td>
              <td className="num-right px-2 text-ink-dim">−{formatCRC(h.deducciones)}</td>
              <td className="num-right px-2 font-semibold">{formatCRC(h.neto)}</td>
              <td className="px-4 text-right">
                <span className="cursor-not-allowed text-[12.5px] font-semibold text-ink-faint" title="Llega con los reportes (Fase 9)">
                  Ver colilla
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TabVacaciones({ ficha }: { ficha: FichaEmpleadoDTO }) {
  return (
    <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <header className="flex h-[54px] items-center justify-between border-b border-line-soft px-4">
        <div className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">
          Períodos tomados
          <span className="num ml-2 text-[12px] font-normal text-ink-dim">
            {formatDays(ficha.vacaciones.acumulado)} acumulados · {formatDays(ficha.vacaciones.tomados)} tomados ·{" "}
            <span className="font-semibold text-brand">{formatDays(ficha.vacaciones.saldo)} de saldo</span>
          </span>
        </div>
        <Link
          href={`/vacaciones?emp=${ficha.id}`}
          className="flex h-[30px] items-center gap-1.5 rounded-lg border border-control-border px-2.5 text-[12px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
        >
          <CalendarDays size={13} strokeWidth={2} aria-hidden /> Abrir calendario
        </Link>
      </header>
      {ficha.vacacionesTomadas.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-10 text-center">
          <div className="text-[14px] font-semibold text-ink">Nunca ha tomado vacaciones</div>
          <div className="text-[12.5px] text-ink-mid">
            Registrá el primer rango desde el calendario; el saldo se descuenta solo.
          </div>
        </div>
      ) : (
        <ul className="px-2 py-1.5">
          {ficha.vacacionesTomadas.map((v) => (
            <li
              key={v.rango}
              className="flex h-[46px] items-center gap-3 rounded-[10px] px-2 hover:bg-row-hover"
            >
              <span className="num text-[12.5px] text-ink">{v.rango}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink-faint">
                {v.nota ?? ""}
              </span>
              <Pill tone="neutro">
                {formatDays(v.dias)} día{v.dias !== 1 ? "s" : ""}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
