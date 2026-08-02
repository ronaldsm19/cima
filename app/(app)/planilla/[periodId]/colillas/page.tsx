import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ds/EmptyState";
import { AvatarInitials } from "@/components/ds/AvatarInitials";
import { Pill } from "@/components/ds/Pill";
import { requirePermission } from "@/lib/auth/access";
import { centsToString } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { formatCRC } from "@/lib/format/currency";
import { periodLabel } from "@/lib/planilla/periods";

/** Index of the period's payslips — one click each to the printable view. */
export default async function ColillasPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  await requirePermission("colillas.generar");
  const { periodId } = await params;

  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { items: { include: { employee: true } } },
  });
  if (!period) notFound();

  const conMontos = period.items
    .filter((i) => i.neto != null)
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName, "es"));

  if (conMontos.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Este período todavía no tiene colillas"
        detail="Las colillas se generan cuando se aprueba la planilla y quedan congelados los montos."
        tone="neutral"
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-[12.5px] text-ink-mid">
        Colillas de <span className="font-semibold text-ink">{periodLabel(period)}</span> · abrí
        cada una para imprimirla o guardarla en PDF.
      </p>
      <div className="overflow-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <table className="w-full min-w-[620px] border-collapse">
          <thead className="bg-surface-subtle">
            <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
              <th className="px-4 text-left">Empleado</th>
              <th className="px-2 text-right">Bruto</th>
              <th className="px-2 text-right">Neto</th>
              <th className="w-[110px] px-2 text-left">Estado</th>
              <th className="w-[110px] px-4" />
            </tr>
          </thead>
          <tbody>
            {conMontos.map((i) => (
              <tr key={i.id} className="h-[52px] border-b border-line-row text-[13px] hover:bg-row-hover">
                <td className="px-4">
                  <div className="flex items-center gap-2.5">
                    <AvatarInitials name={i.employee.fullName} size={28} />
                    <span className="text-[13.5px] font-semibold text-ink">
                      {i.employee.fullName}
                    </span>
                  </div>
                </td>
                <td className="num-right px-2">{formatCRC(centsToString(i.bruto!))}</td>
                <td className="num-right px-2 font-semibold">{formatCRC(centsToString(i.neto!))}</td>
                <td className="px-2">
                  <Pill tone={i.paymentStatus === "PAGADO" ? "pagado" : "pendiente"}>
                    {i.paymentStatus === "PAGADO" ? "pagado" : "pendiente"}
                  </Pill>
                </td>
                <td className="px-4 text-right">
                  <Link
                    href={`/planilla/${periodId}/colilla/${i.id}`}
                    className="text-[12.5px] font-semibold text-brand hover:underline"
                  >
                    Abrir colilla
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
