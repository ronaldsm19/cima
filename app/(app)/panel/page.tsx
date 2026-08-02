import { Decimal } from "decimal.js";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Folder,
  Inbox,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { AvatarInitials } from "@/components/ds/AvatarInitials";
import { Pill } from "@/components/ds/Pill";
import { StatCard } from "@/components/ds/StatCard";
import { MarkPaidButton } from "@/components/panel/MarkPaidButton";
import { lineBreakdown } from "@/components/planilla/breakdown";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { notDeleted } from "@/lib/db/filters";
import { prisma } from "@/lib/db/prisma";
import { projectDerived } from "@/lib/db/projectTotals";
import { formatCRC, formatCRC0 } from "@/lib/format/currency";
import { addDaysIso, formatDateCR, todayCR } from "@/lib/format/dates";
import { ensurePeriod, getPlanillaDTO } from "@/lib/planilla/data";
import { currentPeriodKey, parsePeriodSlug, periodSlug } from "@/lib/planilla/periods";
import { MODALIDAD_LABEL } from "@/lib/planilla/dto";
import { projectPill } from "@/lib/projects/status";

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requirePermission("panel.ver");
  const { periodo } = await searchParams;
  const today = todayCR();

  // ── Planilla del período ──────────────────────────────────────────────────
  const key = parsePeriodSlug(periodo) ?? currentPeriodKey();
  const isCurrent = JSON.stringify(key) === JSON.stringify(currentPeriodKey());
  const canCreate = isCurrent && (await hasPermission(user.role, "planilla.editar"));
  const period = await ensurePeriod(key, canCreate);
  const planilla = period ? await getPlanillaDTO(period.id, user.role) : null;

  const zero = new Decimal(0);
  let netoTotal = zero;
  let netoPendiente = zero;
  const pendientes: {
    itemId: string;
    employeeId: string;
    nombre: string;
    modalidad: string;
    neto: Decimal;
  }[] = [];
  if (planilla) {
    for (const line of planilla.lines) {
      const bd = lineBreakdown(line, line.horasExtra, line.adelanto, planilla.params);
      netoTotal = netoTotal.plus(bd.neto);
      if (!line.pagado) {
        netoPendiente = netoPendiente.plus(bd.neto);
        pendientes.push({
          itemId: line.itemId,
          employeeId: line.employeeId,
          nombre: line.nombre,
          modalidad: MODALIDAD_LABEL[line.modalidad],
          neto: bd.neto,
        });
      }
    }
  }
  const totalLineas = planilla?.lines.length ?? 0;
  const puedeMarcar = planilla?.permisos.marcarPagos ?? false;

  // ── Cuentas por cobrar ────────────────────────────────────────────────────
  const proyectos = await prisma.project.findMany({
    where: { ...notDeleted, status: { notIn: ["ENTREGADO", "CANCELADO"] } },
    include: { client: true, payments: true },
  });
  const cxc = proyectos
    .map((p) => ({ p, d: projectDerived(p, p.payments, today) }))
    .filter(({ d }) => d.saldoPendiente.gt(0))
    .sort((a, b) => {
      if (a.d.vencido !== b.d.vencido) return a.d.vencido ? -1 : 1;
      return (a.p.dueDate ?? "9999").localeCompare(b.p.dueDate ?? "9999");
    });
  const cxcTotal = cxc.reduce((acc, { d }) => acc.plus(d.saldoPendiente), zero);
  const vencidos = cxc.filter(({ d }) => d.vencido).length;

  // Proyectos abiertos por estado (vencido derivado aparte)
  const abiertos = proyectos.length;
  const porEstado = new Map<string, { label: string; tone: "pagado" | "pendiente" | "vencido" | "neutro"; n: number }>();
  for (const { p, d } of proyectos.map((p) => ({ p, d: projectDerived(p, p.payments, today) }))) {
    const pill = projectPill(p.status, d.vencido);
    const prev = porEstado.get(pill.label);
    porEstado.set(pill.label, { ...pill, n: (prev?.n ?? 0) + 1 });
  }

  // ── Próximo feriado y vacaciones próximas ────────────────────────────────
  const feriado = await prisma.holiday.findFirst({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
  });
  const en30 = addDaysIso(today, 30);
  const vacacionesProximas = await prisma.vacationRequest.findMany({
    where: { status: "APROBADA", startDate: { gte: today, lte: en30 } },
    include: { employee: { select: { fullName: true } } },
    orderBy: { startDate: "asc" },
    take: 4,
  });

  const slug = period ? periodSlug(period) : periodSlug(key);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Fila de métricas */}
      <div className="grid grid-cols-4 gap-3.5 max-[960px]:grid-cols-2">
        <StatCard
          icon={CreditCard}
          label="Planilla del período"
          value={formatCRC0(netoTotal)}
          foot={<span>{totalLineas} empleados · neto a pagar</span>}
        />
        <StatCard
          icon={Clock}
          label="Falta pagarles"
          tint="amber"
          value={formatCRC0(netoPendiente)}
          valueClass={pendientes.length > 0 ? "text-warn" : "text-ink"}
          foot={<span>{pendientes.length} de {totalLineas} sin aplicar</span>}
        />
        <StatCard
          icon={TrendingUp}
          label="Cuentas por cobrar"
          value={formatCRC0(cxcTotal)}
          foot={
            <span>
              {cxc.length} proyecto{cxc.length !== 1 ? "s" : ""}
              {vencidos > 0 ? ` · ${vencidos} vencido${vencidos !== 1 ? "s" : ""}` : ""}
            </span>
          }
        />
        <StatCard
          icon={Folder}
          label="Proyectos abiertos"
          tint="neutral"
          value={String(abiertos)}
          foot={[...porEstado.values()].map((e) => (
            <Pill key={e.label} tone={e.tone}>
              {e.n} {e.label}
            </Pill>
          ))}
        />
      </div>

      {/* Fila principal */}
      <div className="grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-4 max-[960px]:grid-cols-1">
        {/* Falta pagarles */}
        <section className="flex min-h-0 flex-col rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <header className="flex h-[54px] flex-none items-center gap-2.5 border-b border-line-soft px-4">
            <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">Falta pagarles</h2>
            {pendientes.length > 0 ? (
              <Pill tone="pendiente">
                {pendientes.length} de {totalLineas}
              </Pill>
            ) : null}
            <Link
              href={`/planilla?periodo=${slug}`}
              className="ml-auto flex h-[30px] items-center gap-1 rounded-lg border border-control-border px-2.5 text-[12px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
            >
              Abrir planilla <ChevronRight size={13} strokeWidth={2} aria-hidden />
            </Link>
          </header>
          {pendientes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="flex size-[38px] items-center justify-center rounded-full bg-ok-tint text-ok">
                <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
              </div>
              <div className="text-[14px] font-semibold text-ink">Todos los pagos están aplicados</div>
              <div className="text-[12.5px] text-ink-mid">
                {totalLineas > 0
                  ? `Los ${totalLineas} empleados del período ya cobraron.`
                  : "Este período no tiene líneas de planilla."}
              </div>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto px-2 py-1.5">
              {pendientes.map((p) => (
                <li
                  key={p.itemId}
                  className="flex h-[52px] items-center gap-3 rounded-[10px] px-2 transition-colors duration-[140ms] hover:bg-row-hover"
                >
                  <AvatarInitials name={p.nombre} size={32} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{p.nombre}</div>
                    <div className="text-[11.5px] text-ink-dim">{p.modalidad}</div>
                  </div>
                  <span className="num text-[13.5px] font-medium">{formatCRC(p.neto)}</span>
                  {puedeMarcar ? <MarkPaidButton itemId={p.itemId} /> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cuentas por cobrar */}
        <section className="flex min-h-0 flex-col rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <header className="flex h-[54px] flex-none items-center justify-between gap-2.5 border-b border-line-soft px-4">
            <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">Cuentas por cobrar</h2>
            <span className="num text-[13.5px] font-semibold">{formatCRC0(cxcTotal)}</span>
          </header>
          {cxc.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="flex size-[38px] items-center justify-center rounded-full bg-[#EDF0EC] text-ink-strong">
                <Inbox size={18} strokeWidth={2} aria-hidden />
              </div>
              <div className="text-[14px] font-semibold text-ink">Nada pendiente de cobro</div>
              <div className="text-[12.5px] text-ink-mid">
                Cuando registrés un proyecto con saldo, aparece acá.
              </div>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto px-2 py-1.5">
              {cxc.map(({ p, d }) => {
                const pill = projectPill(p.status, d.vencido);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/proyectos/${p.id}`}
                      className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors duration-[140ms] hover:bg-row-hover"
                    >
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="num text-[11.5px] text-ink-dim">{p.code}</span>
                          <Pill tone={pill.tone}>{pill.label}</Pill>
                        </div>
                        <div className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">
                          {p.client.name}
                        </div>
                        <div
                          className={`text-[11.5px] ${d.vencido ? "text-bad-text" : "text-ink-dim"}`}
                        >
                          {d.vencido
                            ? `vencido hace ${d.diasVencido} día${d.diasVencido !== 1 ? "s" : ""}`
                            : p.dueDate
                              ? `entrega ${formatDateCR(p.dueDate)}`
                              : "sin fecha de entrega"}
                        </div>
                      </div>
                      <span className="num text-[14px] font-semibold">
                        {formatCRC0(d.saldoPendiente)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Próximo feriado · vacaciones próximas */}
      <div className="grid grid-cols-2 gap-3.5 max-[960px]:grid-cols-1">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-warn-tint text-warn">
            <CalendarDays size={15} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[12px] font-semibold text-ink-mid">Próximo feriado</div>
            {feriado ? (
              <div className="text-[13px] font-semibold text-ink">
                {feriado.name}
                <span className="num ml-2 text-[12px] font-normal text-ink-dim">
                  {feriado.date === today ? "hoy" : formatDateCR(feriado.date)}
                  {!feriado.pagoObligatorio ? " · pago no obligatorio" : ""}
                </span>
              </div>
            ) : (
              <div className="text-[13px] text-ink-dim">No hay feriados registrados hacia adelante.</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand">
            <CalendarDays size={15} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[12px] font-semibold text-ink-mid">Vacaciones en los próximos 30 días</div>
            {vacacionesProximas.length === 0 ? (
              <div className="text-[13px] text-ink-dim">Nadie tiene vacaciones programadas.</div>
            ) : (
              <div className="truncate text-[13px] font-semibold text-ink">
                {vacacionesProximas
                  .map((v) => `${v.employee.fullName.split(" ")[0]} (${formatDateCR(v.startDate)})`)
                  .join(" · ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
