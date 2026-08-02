import { History } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ds/EmptyState";
import { Pill, type PillTone } from "@/components/ds/Pill";
import { requirePermission } from "@/lib/auth/access";
import { centsToDecimal } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { formatCRC } from "@/lib/format/currency";
import { formatDateCR } from "@/lib/format/dates";
import { periodLabel, periodSlug } from "@/lib/planilla/periods";
import { Decimal } from "decimal.js";

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  BORRADOR: { tone: "pendiente", label: "borrador" },
  APROBADA: { tone: "neutro", label: "aprobada" },
  PAGADA: { tone: "pagado", label: "pagada" },
};

export default async function PeriodosPage() {
  await requirePermission("planilla.ver");

  const periods = await prisma.payrollPeriod.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }, { numero: "desc" }],
    include: { items: { select: { neto: true, paymentStatus: true } } },
  });

  if (periods.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Todavía no hay períodos"
        detail="La primera quincena se genera sola al abrir la planilla."
      />
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="bg-surface-subtle">
          <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
            <th className="px-4 text-left">Período</th>
            <th className="px-2 text-left">Fecha de pago</th>
            <th className="px-2 text-right">Líneas</th>
            <th className="px-2 text-right">Pagadas</th>
            <th className="px-2 text-right">Neto total</th>
            <th className="w-[110px] px-4 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => {
            const pagadas = p.items.filter((i) => i.paymentStatus === "PAGADO").length;
            const netoTotal = p.items.every((i) => i.neto != null)
              ? p.items.reduce((acc, i) => acc.plus(centsToDecimal(i.neto!)), new Decimal(0))
              : null;
            const pill = STATUS_PILL[p.status];
            return (
              <tr key={p.id} className="h-[46px] border-b border-line-row text-[13px] transition-colors duration-[140ms] hover:bg-row-hover">
                <td className="px-4">
                  <Link
                    href={`/planilla?periodo=${periodSlug(p)}`}
                    className="font-semibold text-ink hover:text-brand"
                  >
                    {periodLabel(p)}
                  </Link>
                </td>
                <td className="num px-2 text-[12.5px] text-ink-mid">{formatDateCR(p.payDate)}</td>
                <td className="num-right px-2">{p.items.length}</td>
                <td className="num-right px-2">{pagadas}</td>
                <td className="num-right px-2 font-semibold">
                  {netoTotal ? formatCRC(netoTotal) : <span className="text-ink-faint">— sin aprobar</span>}
                </td>
                <td className="px-4">
                  <Pill tone={pill.tone}>{pill.label}</Pill>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
